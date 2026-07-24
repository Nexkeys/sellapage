//sellapage/api/checkout-initialize.js/
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

    const subtotal =
      kind === "product"
        ? cartItems.reduce(
            (sum, item) => sum + Number(item.price) * Number(item.quantity),
            0,
          )
        : Number(servicePrice);
    const processingFee = calcProcessingFee(subtotal);
    const parsedDiscountAmount = Number(discountAmount) || 0;
    const grandTotal = Math.max(
      subtotal + parsedDeliveryFee + processingFee - parsedDiscountAmount,
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
                    cartItems: JSON.stringify(cartItems),
                    deliveryFee: parsedDeliveryFee,
                    deliveryAddress: JSON.stringify(deliveryAddress),
                    notes: notes || "",
                  }
                : {
                    bookingDate,
                    bookingTime,
                    serviceId,
                    serviceName: serviceName.trim(),
                    servicePrice: Number(servicePrice),
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
