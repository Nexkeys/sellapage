//sellapage/api/checkout-initialize.js/
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = getFirestore();

const calcProcessingFee = (subtotal) =>
  Math.min(Math.ceil(subtotal * 0.015) + 100, 2000);

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Free-tier protection: on Spark, quota exhaustion is an outage, not a bill.
    if (!memoryRateLimit('checkout-initialize', clientKey(req), 20, 60000)) {
      return tooManyRequests(res)
    }

    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const {
      storeId,
      customerName,
      customerEmail,
      customerPhone,
      cartItems,
      deliveryFee,
      deliveryAddress,
      notes,
      orderType,
      promoCode = "",
      discountAmount = 0,
      bookingDate,
      bookingTime,
      serviceId,
      serviceName,
      servicePrice,
      locationType,
      locationPref,
      customerNotes,
    } = body;

    const kind = orderType === "booking" ? "booking" : "product";

    if (
      !storeId ||
      !customerName?.trim() ||
      !customerEmail?.trim() ||
      !customerPhone?.trim()
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: storeId, customerName, customerEmail, customerPhone",
      });
    }

    if (kind === "product") {
      if (
        !Array.isArray(cartItems) ||
        cartItems.length === 0 ||
        deliveryFee == null ||
        !deliveryAddress ||
        typeof deliveryAddress !== "object"
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: cartItems, deliveryFee, deliveryAddress",
        });
      }

      for (const item of cartItems) {
        const price = Number(item?.price);
        const quantity = Number(item?.quantity);
        if (Number.isNaN(price) || Number.isNaN(quantity) || quantity <= 0) {
          return res.status(400).json({
            error: "Each cart item must have a valid price and quantity > 0",
          });
        }
      }
    } else {
      if (
        !bookingDate ||
        !bookingTime ||
        !serviceId ||
        !serviceName?.trim() ||
        servicePrice == null
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: bookingDate, bookingTime, serviceId, serviceName, servicePrice",
        });
      }

      const parsedServicePrice = Number(servicePrice);
      if (Number.isNaN(parsedServicePrice) || parsedServicePrice < 0) {
        return res.status(400).json({ error: "servicePrice must be a number >= 0" });
      }
    }

    const parsedDeliveryFee = kind === "product" ? Number(deliveryFee) : 0;
    if (kind === "product" && (Number.isNaN(parsedDeliveryFee) || parsedDeliveryFee < 0)) {
      return res.status(400).json({ error: "deliveryFee must be a number >= 0" });
    }

    let storeDoc;
    try {
      storeDoc = await db.collection("stores").doc(storeId).get();
    } catch {
      return res.status(500).json({ error: "Failed to fetch store from Firestore" });
    }

    if (!storeDoc.exists) {
      return res.status(404).json({ error: "Store not found" });
    }

    const store = storeDoc.data();

    if (!store.subaccountCode) {
      return res.status(400).json({
        error:
          "Store has not set up payment receiving. Please contact the seller.",
      });
    }

    const email = store.email;
    if (!email) {
      return res.status(400).json({ error: "Store has no email address on file" });
    }

    // ------------------------------------------------------------------
    // AUTHORITATIVE PRICING — every figure below is read from Firestore.
    //
    // This block previously computed the charge from `item.price`,
    // `servicePrice`, `deliveryFee` and `discountAmount` as supplied in the
    // request body. Since the body is fully attacker-controlled, anyone could
    // buy any product for ₦1 (the Math.max floor) and the resulting Paystack
    // webhook would be genuinely signed — indistinguishable from a real sale
    // to the vendor. Client values are now used only to identify WHAT is being
    // bought; never HOW MUCH it costs.
    // ------------------------------------------------------------------
    let subtotal = 0;
    const verifiedCartItems = [];

    if (kind === "product") {
      const itemRefs = cartItems.map((item) =>
        db
          .collection("stores")
          .doc(storeId)
          .collection("products")
          .doc(String(item?.id || item?.productId || "")),
      );

      let itemSnaps;
      try {
        itemSnaps = await db.getAll(...itemRefs);
      } catch {
        return res.status(400).json({ error: "Could not verify cart items" });
      }

      for (let i = 0; i < cartItems.length; i++) {
        const snap = itemSnaps[i];
        if (!snap || !snap.exists) {
          return res.status(400).json({
            error: "item_unavailable",
            message: "One of the items in your cart is no longer available. Please refresh and try again.",
          });
        }

        const product = snap.data() || {};
        const quantity = Number(cartItems[i]?.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000) {
          return res.status(400).json({ error: "Invalid quantity" });
        }

        const unitPrice = Number(product.price);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          return res.status(500).json({ error: "A product in your cart has invalid pricing" });
        }

        subtotal += unitPrice * quantity;

        // Rebuild the line item from server data so the order record and the
        // vendor's email show true prices, not whatever the client claimed.
        verifiedCartItems.push({
          ...cartItems[i],
          id: snap.id,
          name: product.name || cartItems[i]?.name || "",
          price: unitPrice,
          quantity,
        });
      }
    } else {
      const serviceSnap = await db
        .collection("stores")
        .doc(storeId)
        .collection("services")
        .doc(String(serviceId))
        .get();

      if (!serviceSnap.exists) {
        return res.status(400).json({
          error: "service_unavailable",
          message: "That service is no longer available. Please refresh and try again.",
        });
      }

      subtotal = Number(serviceSnap.data()?.price);
      if (!Number.isFinite(subtotal) || subtotal < 0) {
        return res.status(500).json({ error: "That service has invalid pricing" });
      }
    }

    // Delivery fee must match one of the vendor's configured zones (an array on
    // the store doc, managed in DeliveryTab.jsx) rather than being trusted.
    let verifiedDeliveryFee = 0;
    if (kind === "product") {
      const zones = Array.isArray(store.deliveryZones) ? store.deliveryZones : [];
      if (zones.length > 0) {
        const match = zones.find((z) => Number(z?.price) === parsedDeliveryFee);
        if (!match) {
          return res.status(400).json({
            error: "invalid_delivery_fee",
            message: "Delivery option is no longer valid. Please reselect your delivery area.",
          });
        }
        verifiedDeliveryFee = Number(match.price) || 0;
      }
    }

    // Re-validate the promo code server-side and recompute the discount.
    // `discountAmount` from the body is ignored entirely — validate-discount.js
    // was advisory only, so a client could previously claim any discount.
    let parsedDiscountAmount = 0;
    if (promoCode) {
      const discountSnap = await db
        .collection("stores")
        .doc(storeId)
        .collection("discounts")
        .where("code", "==", String(promoCode).trim().toUpperCase())
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (!discountSnap.empty) {
        const d = discountSnap.docs[0].data() || {};
        const expired =
          d.expiryDate && typeof d.expiryDate.toMillis === "function"
            ? d.expiryDate.toMillis() < Date.now()
            : false;
        const exhausted =
          d.usageLimit != null && Number(d.usageCount || 0) >= Number(d.usageLimit);

        if (!expired && !exhausted) {
          const raw =
            d.type === "percentage"
              ? Math.floor(subtotal * (Number(d.value) / 100))
              : Number(d.value);
          parsedDiscountAmount = Math.max(0, Math.min(Number(raw) || 0, subtotal));
        }
      }
    }

    const processingFee = calcProcessingFee(subtotal);
    const grandTotal = Math.max(
      subtotal + verifiedDeliveryFee + processingFee - parsedDiscountAmount,
      1,
    );
    const amountKobo = Math.round(grandTotal * 100);

    let paystackResponse;
    try {
      paystackResponse = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount: amountKobo,
            callback_url: "https://sellapage.com.ng/billing/callback",
            subaccount: store.subaccountCode,
            bearer: "account",
            metadata: {
              storeId,
              customerName: customerName.trim(),
              customerEmail: customerEmail.trim(),
              customerPhone: customerPhone.trim(),
              processingFee,
              grandTotal,
              promoCode,
              discountAmount: parsedDiscountAmount,
              transactionType: "checkout",
              orderType: kind === "booking" ? "booking" : "checkout",
              ...(kind === "product"
                ? {
                    // Server-verified line items and fee — the webhook builds
                    // the order record from this metadata, so it must not carry
                    // client-claimed prices.
                    cartItems: JSON.stringify(verifiedCartItems),
                    deliveryFee: verifiedDeliveryFee,
                    deliveryAddress: JSON.stringify(deliveryAddress),
                    notes: notes || "",
                  }
                : {
                    bookingDate,
                    bookingTime,
                    serviceId,
                    serviceName: serviceName.trim(),
                    // Server-verified: read from stores/{id}/services/{serviceId},
                    // not from the request body.
                    servicePrice: subtotal,
                    locationType: locationType || "",
                    locationPref: locationPref || "",
                    customerNotes: customerNotes || "",
                  }),
            },
          }),
        },
      );
    } catch {
      return res.status(502).json({ error: "Failed to reach Paystack API" });
    }

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      return res.status(502).json({
        error:
          paystackData.message || "Paystack transaction initialization failed",
      });
    }

    return res.status(200).json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (err) {
    console.error('Handler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
