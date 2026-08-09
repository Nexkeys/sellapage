//sellapage/api/_lib/handle-booking-checkout.js/
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendEmail, escapeHtml } from "./send-email.js";
import { sendPush } from "./send-push.js";

// Service-booking branch of the paystack-webhook "checkout" dispatcher.
// Writes to stores/{storeId}/bookings — a collection separate from stores/{storeId}/orders,
// so a booking never carries product/shipping fields (deliveryFee, deliveryAddress, cartItems)
// and never shares the product fulfillment status vocabulary.
export async function handleBookingCheckout(db, data, res) {
  const {
    storeId,
    customerName,
    customerEmail,
    customerPhone,
    processingFee,
    grandTotal,
    promoCode,
    discountAmount,
    bookingDate,
    bookingTime,
    serviceId,
    serviceName,
    servicePrice,
    locationType,
    locationPref,
    customerNotes,
  } = data.metadata || {};

  if (!storeId) {
    return res.status(400).send("Missing storeId in metadata");
  }

  // Idempotency check for bookings
  const existingBookingSnap = await db
    .collection("stores")
    .doc(storeId)
    .collection("bookings")
    .where("paystackReference", "==", data.reference)
    .limit(1)
    .get();

  if (!existingBookingSnap.empty) {
    return res.status(200).send("Already processed");
  }

  const bookingRef = db
    .collection("stores")
    .doc(storeId)
    .collection("bookings")
    .doc();

  await bookingRef.set({
    customerName,
    customerPhone,
    customerEmail,
    serviceId: serviceId || "",
    serviceName: serviceName || "",
    servicePrice: Number(servicePrice) || 0,
    locationType: locationType || "",
    locationPref: locationPref || "",
    bookingDate: bookingDate || "",
    bookingTime: bookingTime || "",
    customerNotes: customerNotes || "",
    processingFee,
    grandTotal,
    promoCode: promoCode || "",
    discountAmount: Number(discountAmount) || 0,
    paystackReference: data.reference,
    paystackAmount: data.amount,
    paymentStatus: "paid",
    paymentMethod: "card",
    status: "pending",
    itemType: "service",
    itemId: serviceId || "",
    reviewToken: null,
    reviewTokenUsed: false,
    reviewSubmitted: false,
    reminderSent: false,
    createdAt: Timestamp.now(),
    statusLog: [{
      status: "pending",
      changedAt: new Date().toISOString(),
      changedBy: "system",
      changedByLabel: "Booking Created",
    }],
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

  // Customer upsert (best-effort) — same customers collection shared with product orders
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
          lastOrderId: bookingRef.id,
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
          lastOrderId: bookingRef.id,
          storeId,
        });
      } catch (e) {
        console.error("[Customer Upsert] create failed", e);
      }
    }
  } catch (e) {
    console.error("[Customer Upsert] unexpected error", e);
  }

  // Send notifications
  const storeSnap = await db.collection("stores").doc(storeId).get();
  const storeData = storeSnap.data() || {};
  const scheduleLine = [bookingDate, bookingTime].filter(Boolean).join(" at ");

  try {
    await Promise.all([
      sendEmail(
        customerEmail,
        `Your booking with ${storeData.businessName || "the store"} is confirmed ✓`,
        `
          <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
            <div style="background-color: #16a34a; padding: 24px;">
              <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">${storeData.businessName || "Sellapage"}</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">Booking Confirmed!</h2>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Hi ${escapeHtml(customerName)}, your booking has been received and is awaiting confirmation from the vendor.</p>
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 16px 0;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">Service</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${serviceName || "-"}</td>
                  </tr>
                  ${
                    scheduleLine
                      ? `
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">Scheduled for</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${scheduleLine}</td>
                  </tr>`
                      : ""
                  }
                  ${
                    locationPref
                      ? `
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">Location</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${locationPref}</td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 16px; font-weight: bold;">Total Paid</td>
                    <td style="padding: 8px 0; color: #16a34a; font-weight: bold; font-size: 16px; text-align: right;">₦${Number(grandTotal).toLocaleString("en-NG")}</td>
                  </tr>
                </table>
              </div>
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 24px 0;">
                Questions? Contact the store on WhatsApp: ${storeData.whatsappNumber || "see store page"}
              </p>
            </div>
            <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
              This booking was made via Sellapage · sellapage.com.ng
            </div>
          </div>
        `,
      ),
      storeData.fcmToken
        ? sendPush(
            storeData.fcmToken,
            "New Booking Received 📅",
            `${escapeHtml(customerName)} just booked ${serviceName || "a service"} — ₦${Number(grandTotal).toLocaleString("en-NG")}`,
            { bookingId: bookingRef.id, type: "new_booking" },
          )
        : Promise.resolve(),
      storeData.email
        ? sendEmail(
            storeData.email,
            `New booking received — ₦${Number(grandTotal).toLocaleString("en-NG")}`,
            `
              <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
                <div style="background-color: #16a34a; padding: 24px;">
                  <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">${storeData.businessName || "Sellapage"}</h1>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">New Booking Received 📅</h2>
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">You just got a new booking from ${escapeHtml(customerName)}. Here are the details:</p>
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 16px 0;">Booking Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">Service</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${serviceName || "-"}</td>
                      </tr>
                      ${
                        scheduleLine
                          ? `
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">Scheduled for</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${scheduleLine}</td>
                      </tr>`
                          : ""
                      }
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 16px; font-weight: bold;">Total Paid</td>
                        <td style="padding: 8px 0; color: #16a34a; font-weight: bold; font-size: 16px; text-align: right;">₦${Number(grandTotal).toLocaleString("en-NG")}</td>
                      </tr>
                    </table>
                  </div>
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 12px 0;">Customer Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Name</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 14px; text-align: right;">${escapeHtml(customerName || "-")}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Phone</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 14px; text-align: right;">${customerPhone || "-"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Email</td>
                        <td style="padding: 6px 0; color: #111827; font-size: 14px; text-align: right;">${customerEmail || "-"}</td>
                      </tr>
                    </table>
                  </div>
                  <div style="text-align: center; margin-top: 28px;">
                    <a href="https://sellapage.com.ng/dashboard" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">View in Dashboard</a>
                  </div>
                </div>
                <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
                  This booking was made via Sellapage · sellapage.com.ng
                </div>
              </div>
            `,
          )
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("[Booking Checkout Notifications] Error:", error);
  }

  return res.status(200).send("OK");
}
