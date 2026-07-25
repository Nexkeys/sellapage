//sellapage/api/paystack-webhook.js/
import crypto from "crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendEmail } from "./_lib/send-email.js";
import { sendPush } from "./_lib/send-push.js";

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = getFirestore();

const PRICE_MATRIX = {
  growth: { monthly: 500000, quarterly: 1350000, biannual: 2550000, annual: 4800000 },
  pro: { monthly: 1200000, quarterly: 3240000, biannual: 6120000, annual: 11520000 },
  premium: { monthly: 2500000, quarterly: 6750000, biannual: 12750000, annual: 24000000 },
}

const PERIOD_MONTHS = { monthly: 1, quarterly: 3, biannual: 6, annual: 12 }

const PLAN_LIMITS = {
  growth: {
    maxProducts: 50,
    maxImagesPerProduct: 10,
    maxJobListings: 25,
    hasGrowthFeatures: true,
    hasProFeatures: false,
    hasPremiumFeatures: false,
  },
  pro: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    maxJobListings: 50,
    hasGrowthFeatures: true,
    hasProFeatures: true,
    hasPremiumFeatures: false,
  },
  premium: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    maxJobListings: 999999,
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
  const rawBodyBuffer = await getRawBody(req);
  const rawBody = rawBodyBuffer.toString("utf8");

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
    // Dispatch to the product-order or service-booking branch — the two flows
    // never converge past this point (separate collections, separate emails,
    // separate status vocabularies downstream in update-order-status.js /
    // update-booking-status.js).
    if (data.metadata?.orderType === "booking") {
      const { handleBookingCheckout } = await import("./_lib/handle-booking-checkout.js");
      return handleBookingCheckout(db, data, res);
    }
    const { handleProductCheckout } = await import("./_lib/handle-product-checkout.js");
    return handleProductCheckout(db, data, res);
  }

  if (transactionType === "shipment" && data.metadata?.provider !== "topship") {
    try {
      const { createSendboxShipment } = await import("./_lib/sendbox-booking.js")
      const {
        storeId,
        orderId,
        courierId,
        courierName,
        senderDetails: senderDetailsRaw,
        receiverDetails: receiverDetailsRaw,
        weight,
        pickupDate,
        packageType,
      } = data.metadata || {}

      if (!storeId || !orderId || !courierId) {
        return res.status(200).send("Missing shipment metadata, skipped")
      }

      const storeDoc = await db.collection("stores").doc(storeId).get()
      if (!storeDoc.exists) {
        return res.status(200).send("Store not found, skipped")
      }

      const orderDoc = await db
        .collection("stores")
        .doc(storeId)
        .collection("orders")
        .doc(orderId)
        .get()
      if (!orderDoc.exists) {
        return res.status(200).send("Order not found, skipped")
      }

      const senderDetails = typeof senderDetailsRaw === "string" ? JSON.parse(senderDetailsRaw) : senderDetailsRaw
      const receiverDetails = typeof receiverDetailsRaw === "string" ? JSON.parse(receiverDetailsRaw) : receiverDetailsRaw

      const appUrl = process.env.APP_URL || "https://www.sellapage.com.ng"
      const callbackUrl = `${appUrl}/api/sendbox-webhook?transactionType=tracking`

      const result = await createSendboxShipment({
        senderDetails,
        receiverDetails,
        weight: Number(weight) || 1,
        courierId,
        pickupDate: pickupDate || new Date().toISOString().split("T")[0],
        totalValue: Number(orderDoc.data()?.total) || 5000,
        packageType: packageType || "general",
        callbackUrl,
      })

      if (!result.success) {
        console.error("[paystack-webhook] Shipment creation failed:", result.error)
        return res.status(200).send("Shipment creation failed")
      }

      const shipmentData = result.data
      const now = new Date()
      const trackingUrl =
        shipmentData.tracking_url ||
        (shipmentData.code
          ? `https://track.sendbox.co/shipment/${shipmentData.code}`
          : "")

      await db
        .collection("stores")
        .doc(storeId)
        .collection("orders")
        .doc(orderId)
        .update({
          status: "confirmed",
          courierName: courierName || "Sendbox",
          courierTrackingCode: shipmentData.code || "",
          courierTrackingUrl: trackingUrl,
          bookingTimestamp: now.toISOString(),
          shipmentBooked: true,
          statusLog: FieldValue.arrayUnion({
            status: "confirmed",
            changedAt: now.toISOString(),
            changedBy: "system",
            changedByLabel: "Shipment Booked",
          }),
        })

      return res.status(200).send("OK")
    } catch (err) {
      console.error("[paystack-webhook] Shipment safety net error:", err)
      return res.status(200).send("Shipment processing error")
    }
  }

  // Topship safety net — mirrors the Sendbox branch above but for Topship-provider
  // shipments. STAGING ONLY (see _lib/topship-booking.js). No separate Paystack verify
  // call needed here: this webhook is already HMAC-verified by Paystack, same trust
  // model as the Sendbox branch above.
  if (transactionType === "shipment" && data.metadata?.provider === "topship") {
    try {
      const { bookTopshipShipment, resolveShipmentRoute } = await import("./_lib/topship-booking.js")
      const {
        storeId,
        orderId,
        pricingTier,
        senderDetails: senderDetailsRaw,
        receiverDetails: receiverDetailsRaw,
        weight,
        shippingFee,
        itemCategory,
        insuranceType,
        pickupDate,
      } = data.metadata || {}

      if (!storeId || !orderId || !pricingTier) {
        return res.status(200).send("Missing shipment metadata, skipped")
      }

      const orderRef = db.collection("stores").doc(storeId).collection("orders").doc(orderId)
      const orderDoc = await orderRef.get()
      if (!orderDoc.exists) {
        return res.status(200).send("Order not found, skipped")
      }

      const senderDetails = typeof senderDetailsRaw === "string" ? JSON.parse(senderDetailsRaw) : senderDetailsRaw
      const receiverDetails = typeof receiverDetailsRaw === "string" ? JSON.parse(receiverDetailsRaw) : receiverDetailsRaw
      const shippingFeeNum = Number(shippingFee) || 0

      const result = await bookTopshipShipment({
        items: [{
          category: itemCategory || "Others",
          description: "Package",
          weight: Number(weight) || 1,
          quantity: 1,
          value: Math.round(shippingFeeNum * 100),
        }],
        itemCollectionMode: "PickUp",
        pricingTier,
        insuranceType: insuranceType || "None",
        shipmentChargeNaira: shippingFeeNum,
        pickupDate: pickupDate || new Date().toISOString().split("T")[0],
        shipmentRoute: resolveShipmentRoute(senderDetails?.countryCode, receiverDetails?.countryCode),
        senderDetail: {
          name: senderDetails?.name,
          email: senderDetails?.email,
          phone: senderDetails?.phone,
          addressLine1: senderDetails?.address,
          state: senderDetails?.state,
          city: senderDetails?.city,
          country: senderDetails?.country,
          countryCode: senderDetails?.countryCode,
          postalCode: senderDetails?.postalCode,
        },
        receiverDetail: {
          name: receiverDetails?.name,
          email: receiverDetails?.email,
          phone: receiverDetails?.phone,
          addressLine1: receiverDetails?.address,
          state: receiverDetails?.state,
          city: receiverDetails?.city,
          country: receiverDetails?.country,
          countryCode: receiverDetails?.countryCode,
          postalCode: receiverDetails?.postalCode,
        },
      })

      if (!result.success) {
        console.error("[paystack-webhook] Topship shipment creation failed:", result.error)
        return res.status(200).send("Shipment creation failed")
      }

      const shipData = result.data
      const now = new Date()

      await orderRef.update({
        topshipTrackingId: shipData?.trackingId || shipData?.thirdPartyTrackingId || "",
        topshipShipmentId: shipData?.id || "",
        topshipTrackingUrl: shipData?.trackingUrl || "",
        topshipStatus: shipData?.shipmentStatus || "Confirmed",
        provider: "topship",
        status: "dispatched",
        updatedAt: now.toISOString(),
        statusLog: FieldValue.arrayUnion({
          status: "dispatched",
          changedAt: now.toISOString(),
          changedBy: "system",
          changedByLabel: "Shipment Booked (Topship)",
        }),
      })

      return res.status(200).send("OK")
    } catch (err) {
      console.error("[paystack-webhook] Topship shipment safety net error:", err)
      return res.status(200).send("Shipment processing error")
    }
  }

  // Subscription handling (existing logic)
  const { storeId, plan, billingPeriod = 'monthly' } = data.metadata || {};

  if (!storeId || !plan) {
    return res.status(400).send("Missing storeId or plan in metadata");
  }

  if (!["growth", "pro", "premium"].includes(plan)) {
    return res.status(400).send("Invalid plan in metadata");
  }

  const expectedAmount = PRICE_MATRIX[plan]?.[billingPeriod];
  if (!expectedAmount) {
    return res.status(400).send(`Invalid plan/period combination: ${plan}/${billingPeriod}`);
  }

  if (data.amount !== expectedAmount) {
    return res.status(400).send(`Amount mismatch: expected ${expectedAmount}, got ${data.amount}`);
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
  
  // Fetch store data early to check for existing active subscription time
  const storeCheckSnap = await db.collection("stores").doc(storeId).get();
  const storeCheckData = storeCheckSnap.data() || {};
  const existingEndMillis = storeCheckData.planEndDate?.toMillis?.() || 0;
  const nowMillis = now.toMillis();
  
  // If current plan is still active, append time to the existing end date. Otherwise, start from now.
  const baseDate = existingEndMillis > nowMillis ? new Date(existingEndMillis) : now.toDate();
  const planStartDate = existingEndMillis > nowMillis ? Timestamp.fromMillis(existingEndMillis) : now;

  const monthsCount = PERIOD_MONTHS[billingPeriod] || 1;
  const endDateObj = new Date(baseDate);
  endDateObj.setMonth(endDateObj.getMonth() + monthsCount);
  const planEndDate = Timestamp.fromDate(endDateObj);

  // Calculate grace period (strictly 2 days past the calculated plan end date)
  const graceUntil = Timestamp.fromMillis(endDateObj.getTime() + 2 * 24 * 60 * 60 * 1000);
  const limits = PLAN_LIMITS[plan];

  const storeRef = db.collection("stores").doc(storeId);
  const subscriptionRef = storeRef.collection("subscriptions").doc();

  const batch = db.batch();

  batch.update(storeRef, {
    plan,
    billingPeriod,
    planStatus: "active",
    planStartDate,
    planEndDate,
    graceUntil,
    ...limits,
  });

  batch.set(subscriptionRef, {
    plan,
    billingPeriod,
    amount: data.amount,
    currency: "NGN",
    status: "success",
    paystackRef: data.reference,
    paidAt: now,
    planStartDate,
    planEndDate,
  });

  await batch.commit();

  // --- Referral Reward Creation (incremental, one-time-per-tier, immediately available) ---
  // Commission is keyed to the HIGHEST plan tier the referred vendor has reached, not
  // their first payment. We track the cumulative amount already credited to the referrer
  // for this referred vendor on the referred store's own `referralCreditedToReferrer`
  // field, and only ever credit the positive delta up to the new tier's reward. So:
  //   first Growth  -> +₦500 (delta 50000-0)
  //   upgrade Pro    -> +₦500 (delta 100000-50000)  = ₦1,000 total
  //   upgrade Premium-> +₦1,000 (delta 200000-100000) = ₦2,000 total (cap)
  //   renewal / same tier -> delta 0, nothing credited
  //   downgrade -> delta negative, nothing credited, no clawback
  // Earnings land in `referralAvailable` immediately (no holding period — the manual
  // admin payout-approval step is the fraud checkpoint). The outer W1 idempotency guard
  // (subscriptions where paystackRef == reference) prevents double-processing per payment,
  // and the whole thing is written in one atomic batch.
  try {
    const referredById = storeCheckData.referredBy
    if (referredById) {
      const referrerSnap = await db.collection("stores").doc(referredById).get()
      if (referrerSnap.exists) {
        const REFERRAL_REWARDS = { growth: 50000, pro: 100000, premium: 200000 }
        const targetReward = REFERRAL_REWARDS[plan] || 0
        const alreadyCredited = storeCheckData.referralCreditedToReferrer || 0
        const delta = targetReward - alreadyCredited
        if (delta > 0) {
          const referralBatch = db.batch()
          const rewardRef = db.collection("referralRewards").doc()
          referralBatch.set(rewardRef, {
            referrerId: referredById,
            referredUserId: storeId,
            referredUserEmail: storeCheckData.email || "",
            referredUserName: storeCheckData.businessName || "",
            plan,
            billingPeriod,
            amountPaid: data.amount,
            rewardAmount: delta,
            status: "available",
            createdAt: Timestamp.now(),
            availableAt: Timestamp.now(),
          })
          const referrerUpdate = {
            referralAvailable: FieldValue.increment(delta),
            referralTotalEarned: FieldValue.increment(delta),
          }
          // Count each distinct referred vendor once (on their first reward), not per upgrade.
          if (alreadyCredited === 0) {
            referrerUpdate.referralTotalPaid = FieldValue.increment(1)
          }
          referralBatch.update(db.collection("stores").doc(referredById), referrerUpdate)
          referralBatch.update(storeRef, { referralCreditedToReferrer: targetReward })
          await referralBatch.commit()
        }
      }
    }
  } catch (err) {
    console.error("[Referral Reward] Error:", err)
  }

  // Send notifications — reuse storeCheckSnap from earlier
  const storeData = storeCheckSnap.data() || {};
  const planLabel = { growth: "Growth", pro: "Pro", premium: "Premium" }[plan];
  const periodLabel = { monthly: "Monthly", quarterly: "Quarterly", biannual: "6-Month", annual: "Annual" }[billingPeriod];

  const planFeatures = {
    growth: [
      "Up to 50 products",
      "10 images per product",
      "Custom domain connection",
      "Discount & promo codes",
      "Data export (CSV)",
    ],
    pro: [
      "Unlimited products",
      "50 images per product",
      "Advanced analytics dashboard",
      "Priority support",
      "All Growth features included",
    ],
    premium: [
      "Unlimited products",
      "50 images per product",
      "Premium support & onboarding",
      "Full analytics suite",
      "All Pro features included",
    ],
  };

  const features = planFeatures[plan] || planFeatures.growth;
  const featureRows = features
    .map(
      (f) => `
      <tr>
        <td style="padding: 6px 0; color: #16a34a; font-size: 14px; width: 24px; vertical-align: top;">✓</td>
        <td style="padding: 6px 0; color: #374151; font-size: 14px;">${f}</td>
      </tr>`
    )
    .join("");

  const renewDate = planEndDate.toDate().toLocaleDateString("en-NG", { dateStyle: "long" });
  const startDate = planStartDate.toDate().toLocaleDateString("en-NG", { dateStyle: "long" });

  try {
    await Promise.all([
      storeData.email
        ? sendEmail(
            storeData.email,
            `Your Sellapage ${planLabel} plan (${periodLabel}) is now active ✓`,
            `
          <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
            <div style="background-color: #16a34a; padding: 24px;">
              <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">Sellapage</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px 0;">${planLabel} Plan Activated!</h2>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Hi ${storeData.businessName || "there"}, your ${periodLabel} ${planLabel} plan is live and your new features are unlocked.</p>

              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #16a34a; font-size: 14px; font-weight: bold; margin: 0 0 12px 0;">What You Unlocked</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${featureRows}
                </table>
              </div>

              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 12px 0;">Receipt</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: bold; text-align: right;">${planLabel} (${periodLabel})</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount Paid</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">₦${(data.amount / 100).toLocaleString("en-NG")}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Activated</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${startDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Renews</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${renewDate}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 28px;">
                <a href="https://sellapage.com.ng/dashboard" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Open My Dashboard</a>
              </div>
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
            `Your ${periodLabel} ${planLabel} plan is active until ${renewDate}. Enjoy your new features!`,
            { type: "subscription", plan, billingPeriod },
          )
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("[Subscription Notifications] Error:", error);
  }

  return res.status(200).send("OK");
};
