//sellapage/api/paystack-webhook.js/
import crypto from "crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendEmail } from "./_lib/send-email.js";
import { sendPush } from "./_lib/send-push.js";

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = getFirestore();

const PLAN_AMOUNTS = {
  growth: 500000,
  pro: 1200000,
  premium: 2500000,
};

const PLAN_LIMITS = {
  growth: {
    maxProducts: 50,
    maxImagesPerProduct: 10,
    hasGrowthFeatures: true,
    hasProFeatures: false,
    hasPremiumFeatures: false,
  },
  pro: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    hasGrowthFeatures: true,
    hasProFeatures: true,
    hasPremiumFeatures: false,
  },
  premium: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    hasGrowthFeatures: true,
    hasProFeatures: true,
    hasPremiumFeatures: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const signature = req.headers["x-paystack-signature"];
  const rawBody = req.body;

  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).send("Invalid signature");
  }

  let payload;
  try {
    payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch {
    return res.status(400).send("Invalid JSON");
  }

  const { event: eventType, data } = payload;

  if (eventType !== "charge.success" || data?.status !== "success") {
    return res.status(200).send("Event ignored");
  }

  // Branch on transaction type
  const transactionType = data.metadata?.transactionType;

  if (transactionType === "checkout") {
    // Checkout payment handling
    const {
      storeId,
      customerName,
      customerEmail,
      customerPhone,
      cartItems,
      deliveryFee,
      processingFee,
      grandTotal,
      deliveryAddress,
      notes,
      orderType,
      promoCode,
      discountAmount,
    } = data.metadata || {};

    if (!storeId) {
      return res.status(400).send("Missing storeId in metadata");
    }

    // Parse JSON strings
    let parsedCartItems;
    let parsedDeliveryAddress;
    try {
      parsedCartItems = JSON.parse(cartItems);
      parsedDeliveryAddress = JSON.parse(deliveryAddress);
    } catch {
      return res.status(400).send("Invalid JSON in cartItems or deliveryAddress");
    }

    // Idempotency check for orders
    const existingOrderSnap = await db
      .collection("stores")
      .doc(storeId)
      .collection("orders")
      .where("paystackReference", "==", data.reference)
      .limit(1)
      .get();

    if (!existingOrderSnap.empty) {
      return res.status(200).send("Already processed");
    }

    // Create order document
    const orderRef = db
      .collection("stores")
      .doc(storeId)
      .collection("orders")
      .doc();
    const itemsString = parsedCartItems
      .map((item) => `${item.name} x${item.quantity}`)
      .join(", ");

    await orderRef.set({
      customerName,
      customerPhone,
      customerEmail,
      items: itemsString,
      total: grandTotal,
      deliveryFee,
      processingFee,
      grandTotal,
      deliveryAddress: parsedDeliveryAddress,
      notes,
      promoCode: promoCode || "",
      discountAmount: Number(discountAmount) || 0,
      paystackReference: data.reference,
      paystackAmount: data.amount,
      orderType: orderType || "checkout",
      status: "pending",
      paymentStatus: "paid",
      paymentMethod: "card",
      createdAt: Timestamp.now(),
    });

    if (typeof promoCode === "string" && promoCode.trim()) {
      try {
        const normalizedPromoCode = promoCode.trim().toUpperCase();
        const discountSnap = await db
          .collection("stores")
          .doc(storeId)
          .collection("discounts")
          .where("code", "==", normalizedPromoCode)
          .where("isActive", "==", true)
          .limit(1)
          .get();

        if (!discountSnap.empty) {
          await discountSnap.docs[0].ref.update({
            usageCount: FieldValue.increment(1),
          });
        }
      } catch (error) {
        console.error("[Discount Usage Increment] failed", error);
      }
    }

    // Customer upsert (best-effort)
    try {
      const rawPhone = (customerPhone || "").toString();
      let customerId = rawPhone.replace(/\D+/g, "");
      if (!customerId) {
        const emailPart = (customerEmail || "").slice(0, 20);
        customerId = emailPart.replace(/[^a-zA-Z0-9]/g, "_") || "guest";
      }
      const custRef = db
        .collection("stores")
        .doc(storeId)
        .collection("customers")
        .doc(customerId);
      const custSnap = await custRef.get();
      if (custSnap.exists) {
        const cd = custSnap.data() || {};
        const prevCount = cd.orderCount || 0;
        const prevTotal = cd.totalSpent || 0;
        try {
          await custRef.update({
            orderCount: prevCount + 1,
            totalSpent: prevTotal + (Number(grandTotal) || 0),
            lastOrderDate: Timestamp.now(),
            lastOrderId: orderRef.id,
            name: customerName || cd.name || "",
            email: customerEmail || cd.email || "",
            phone: customerPhone || cd.phone || "",
          });
        } catch (e) {
          console.error("[Customer Upsert] update failed", e);
        }
      } else {
        try {
          await custRef.set({
            name: customerName || "",
            phone: customerPhone || "",
            email: customerEmail || "",
            orderCount: 1,
            totalSpent: Number(grandTotal) || 0,
            firstOrderDate: Timestamp.now(),
            lastOrderDate: Timestamp.now(),
            lastOrderId: orderRef.id,
            storeId,
          });
        } catch (e) {
          console.error("[Customer Upsert] create failed", e);
        }
      }
    } catch (e) {
      console.error("[Customer Upsert] unexpected error", e);
    }

    // Add review meta to order document (itemType & itemId)
    try {
      const parsedItems = Array.isArray(parsedCartItems) ? parsedCartItems : [];
      const firstItem = parsedItems[0] || {};
      const itemId = firstItem?.id || "";
      const itemType = orderType === "booking" ? "service" : "product";
      await orderRef.update({ itemId, itemType });
    } catch (e) {
      console.error("[Order Review Meta] failed to write itemId/itemType", e);
    }

    // Send notifications
    const storeSnap = await db.collection("stores").doc(storeId).get();
    const storeData = storeSnap.data() || {};

    try {
      await Promise.all([
        sendEmail(
          customerEmail,
          `Your order from ${storeData.businessName || "the store"} is confirmed ✓`,
          `
            <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
              <div style="background-color: #16a34a; padding: 24px;">
                <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">${storeData.businessName || "Sellapage"}</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">Order Confirmed!</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Hi ${customerName}, your order has been received and is being processed.</p>
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 16px 0;">Order Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    ${parsedCartItems
                      .map(
                        (item) => `
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">${item.name}</td>
                        <td style="padding: 8px 0; color: #16a34a; font-weight: bold; font-size: 14px; text-align: right;">₦${(item.price * item.quantity).toLocaleString("en-NG")}</td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </table>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #374151; font-size: 14px;">Delivery Fee</td>
                      <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right;">₦${Number(deliveryFee).toLocaleString("en-NG")}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #374151; font-size: 16px; font-weight: bold;">Total Paid</td>
                      <td style="padding: 8px 0; color: #16a34a; font-weight: bold; font-size: 16px; text-align: right;">₦${Number(grandTotal).toLocaleString("en-NG")}</td>
                    </tr>
                  </table>
                </div>
                ${
                  parsedDeliveryAddress?.state || parsedDeliveryAddress?.address
                    ? `
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px 0;">
                    Delivery to: ${parsedDeliveryAddress.address || ""}${parsedDeliveryAddress.address && parsedDeliveryAddress.state ? ", " : ""}${parsedDeliveryAddress.state || ""}
                  </p>
                `
                    : ""
                }
                <p style="color: #6b7280; font-size: 13px; margin: 0 0 24px 0;">
                  Questions? Contact the store on WhatsApp: ${storeData.whatsappNumber || "see store page"}
                </p>
              </div>
              <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
                This order was placed via Sellapage · sellapage.com.ng
              </div>
            </div>
          `,
        ),
        storeData.fcmToken
          ? sendPush(
              storeData.fcmToken,
              "New Order Received 🛍️",
              `${customerName} just placed an order — ₦${Number(grandTotal).toLocaleString("en-NG")}`,
              { orderId: orderRef.id, type: "new_order" },
            )
          : Promise.resolve(),
      ]);
    } catch (error) {
      console.error("[Checkout Notifications] Error:", error);
    }

    return res.status(200).send("OK");
  }

  // Subscription handling (existing logic)
  const { storeId, plan } = data.metadata || {};

  if (!storeId || !plan) {
    return res.status(400).send("Missing storeId or plan in metadata");
  }

  if (!["growth", "pro", "premium"].includes(plan)) {
    return res.status(400).send("Invalid plan in metadata");
  }

  if (data.amount !== PLAN_AMOUNTS[plan]) {
    return res.status(400).send(`Amount mismatch: expected ${PLAN_AMOUNTS[plan]}, got ${data.amount}`);
  }

  // W1 idempotency guard
  const existingSubSnap = await db
    .collection("stores")
    .doc(storeId)
    .collection("subscriptions")
    .where("paystackRef", "==", data.reference)
    .limit(1)
    .get();

  if (!existingSubSnap.empty) {
    return res.status(200).send("Already processed");
  }

  const now = Timestamp.now();
  const planStartDate = now;
  const planEndDate = Timestamp.fromMillis(
    now.toMillis() + 30 * 24 * 60 * 60 * 1000,
  );
  const graceUntil = Timestamp.fromMillis(
    planEndDate.toMillis() + 2 * 24 * 60 * 60 * 1000,
  );

  const limits = PLAN_LIMITS[plan];

  const storeRef = db.collection("stores").doc(storeId);
  const subscriptionRef = storeRef.collection("subscriptions").doc();

  const batch = db.batch();

  batch.update(storeRef, {
    plan,
    planStatus: "active",
    planStartDate,
    planEndDate,
    graceUntil,
    ...limits,
  });

  batch.set(subscriptionRef, {
    plan,
    amount: data.amount,
    currency: "NGN",
    status: "success",
    paystackRef: data.reference,
    paidAt: now,
    planStartDate,
    planEndDate,
  });

  await batch.commit();

  // Send notifications
  const storeSnap = await db.collection("stores").doc(storeId).get();
  const storeData = storeSnap.data() || {};
  const planLabel = { growth: "Growth", pro: "Pro", premium: "Premium" }[plan];

  try {
    await Promise.all([
      storeData.email
        ? sendEmail(
            storeData.email,
            `Your Sellapage ${planLabel} plan is now active ✓`,
            `
          <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
            <div style="background-color: #16a34a; padding: 24px;">
              <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">Sellapage</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">${planLabel} Plan Activated!</h2>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Your ${planLabel} plan is live and your new features are unlocked.</p>
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">Plan</td>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: bold; text-align: right;">${planLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">Amount Paid</td>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right;">₦${(data.amount / 100).toLocaleString("en-NG")}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">Valid Until</td>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right;">${planEndDate.toDate().toLocaleDateString("en-NG", { dateStyle: "long" })}</td>
                  </tr>
                </table>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Visit your dashboard to start using your new features.</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
              Sellapage · sellapage.com.ng
            </div>
          </div>
        `,
          )
        : Promise.resolve(),
      storeData.fcmToken
        ? sendPush(
            storeData.fcmToken,
            `${planLabel} Plan Active ✅`,
            `Your ${planLabel} plan is live. Enjoy your new features!`,
            { type: "subscription", plan },
          )
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("[Subscription Notifications] Error:", error);
  }

  return res.status(200).send("OK");
};
