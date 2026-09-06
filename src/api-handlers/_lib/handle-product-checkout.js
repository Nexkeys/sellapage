//sellapage/api/_lib/handle-product-checkout.js/
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendEmail, escapeHtml } from "./send-email.js";
import { sendPush } from "./send-push.js";
import { earnPointsForOrder, commitRedemption, formatCode } from "./loyalty.js";
import { markRecovered } from "./abandoned-checkout.js";

// Product-order branch of the paystack-webhook "checkout" dispatcher.
// Moved verbatim out of paystack-webhook.js's former single checkout branch - logic
// unchanged, only relocated so the booking branch (handle-booking-checkout.js) has
// its own file instead of both flows sharing one code path.
export async function handleProductCheckout(db, data, res) {
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
    subtotal,
    loyaltyCode,
    pointsRedeemed,
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

  // Reconciliation: what Paystack actually charged (data.amount, in kobo) must
  // match the total recorded in the transaction metadata. checkout-initialize.js
  // now prices everything server-side, so a mismatch means metadata tampering or
  // a pricing bug - flagged on the order rather than silently accepted.
  const expectedKobo = Math.round(Number(grandTotal) * 100);
  const chargedKobo = Number(data.amount);
  const amountMismatch =
    Number.isFinite(expectedKobo) && Number.isFinite(chargedKobo) && expectedKobo !== chargedKobo;

  if (amountMismatch) {
    console.error(
      `[handle-product-checkout] AMOUNT MISMATCH ref=${data.reference} store=${storeId} ` +
      `expected=${expectedKobo} charged=${chargedKobo}`,
    );
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
    cartItems: parsedCartItems,
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
    // Surfaces a suspicious order in the dashboard instead of it looking normal.
    ...(amountMismatch ? { amountMismatch: true, expectedAmountKobo: expectedKobo } : {}),
    orderType: orderType || "checkout",
    status: "pending",
    paymentStatus: "paid",
    paymentMethod: "card",
    createdAt: Timestamp.now(),
    statusLog: [{
      status: "pending",
      changedAt: new Date().toISOString(),
      changedBy: "system",
      changedByLabel: "Order Placed",
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
    await orderRef.update({ itemId, itemType: "product" });
  } catch (e) {
    console.error("[Order Review Meta] failed to write itemId/itemType", e);
  }

  // Send notifications
  const storeSnap = await db.collection("stores").doc(storeId).get();
  const storeData = storeSnap.data() || {};

  // ------------------------------------------------------------------
  // Loyalty points. Runs after the order exists and is wrapped whole, because
  // nothing here is worth failing a paid order over. Every branch inside
  // earnPointsForOrder / commitRedemption exits immediately unless the store is
  // Premium AND has loyalty switched on, so for every other vendor this block
  // costs one already-fetched store document and nothing else.
  //
  // Points come off HERE, at confirmation, not at checkout start, so an
  // abandoned checkout never burns a customer's balance.
  // ------------------------------------------------------------------
  let loyaltyResult = null;
  let loyaltySpent = 0;
  try {
    if (loyaltyCode && Number(pointsRedeemed) > 0) {
      loyaltySpent = await commitRedemption(db, storeId, loyaltyCode, Number(pointsRedeemed));
    }

    loyaltyResult = await earnPointsForOrder(db, storeId, storeData, {
      customerName,
      customerEmail,
      customerPhone,
      subtotal,
    });

    // Persisted on the order so a cancellation can reverse exactly what this
    // order did, rather than recomputing it from rates that may have changed.
    if (loyaltyResult || loyaltySpent > 0) {
      await orderRef.update({
        loyaltyCode: loyaltyResult?.code || loyaltyCode || "",
        loyaltyEarned: loyaltyResult?.earned || 0,
        loyaltyRedeemed: loyaltySpent,
      });
    }
  } catch (err) {
    console.error("[handle-product-checkout] loyalty failed", err);
  }

  // This checkout is no longer abandoned. Fire and forget: markRecovered never
  // throws, and a missing record is the normal case for a non-Premium store.
  markRecovered(db, storeId, data.reference, customerEmail);

  // The code also renders on the success screen, but the Paystack redirect
  // usually beats this webhook, so on a first order that screen may load before
  // the card exists. Email is the guaranteed delivery path; the screen is only
  // the fast one. Fire and forget, never awaited into the payment path.
  if (loyaltyResult && customerEmail) {
    const pretty = formatCode(loyaltyResult.code);
    const brand = escapeHtml(storeData.businessName || "Sellapage");
    sendEmail(
      customerEmail,
      loyaltyResult.isNew
        ? `Your ${storeData.businessName || "loyalty"} points card`
        : `You earned ${loyaltyResult.earned} points`,
      `
        <div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,sans-serif;">
          <div style="background:#16a34a;padding:24px;">
            <h1 style="color:#fff;font-size:22px;margin:0;font-weight:bold;">${brand}</h1>
          </div>
          <div style="padding:32px;color:#111827;">
            <h2 style="font-size:20px;margin:0 0 12px 0;">
              ${loyaltyResult.isNew ? "Here is your points card" : "Points added"}
            </h2>
            <p style="color:#6b7280;font-size:14px;margin:0 0 20px 0;">
              Hi ${escapeHtml(customerName || "there")}, you earned
              <strong>${loyaltyResult.earned} points</strong> on this order.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px 0;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#16a34a;font-weight:bold;letter-spacing:1px;">YOUR CODE</p>
              <p style="margin:0;font-size:26px;font-weight:bold;letter-spacing:3px;color:#111827;">${pretty}</p>
              <p style="margin:10px 0 0 0;font-size:13px;color:#6b7280;">Balance: ${loyaltyResult.points} points</p>
            </div>
            <p style="color:#6b7280;font-size:13px;margin:0;">
              Save this code. Enter it at checkout next time you shop with ${brand}
              to spend your points. If you lose it, use the "lost your code" link
              at checkout and we will email it again.
            </p>
          </div>
        </div>
      `,
    ).catch(() => {});
  }

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
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Hi ${escapeHtml(customerName)}, your order has been received and is being processed.</p>
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
            `${escapeHtml(customerName)} just placed an order - ₦${Number(grandTotal).toLocaleString("en-NG")}`,
            { orderId: orderRef.id, type: "new_order" },
          )
        : Promise.resolve(),
      storeData.email
        ? sendEmail(
            storeData.email,
            `New order received - ₦${Number(grandTotal).toLocaleString("en-NG")}`,
            `
              <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
                <div style="background-color: #16a34a; padding: 24px;">
                  <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">${storeData.businessName || "Sellapage"}</h1>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">New Order Received 🛍️</h2>
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">You just got a new order from ${escapeHtml(customerName)}. Here are the details:</p>
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
                  ${
                    parsedDeliveryAddress?.state || parsedDeliveryAddress?.address
                      ? `
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px 0;">
                      Delivery to: ${parsedDeliveryAddress.address || ""}${parsedDeliveryAddress.address && parsedDeliveryAddress.state ? ", " : ""}${parsedDeliveryAddress.state || ""}
                    </p>
                  `
                      : ""
                  }
                  <div style="text-align: center; margin-top: 28px;">
                    <a href="https://sellapage.com.ng/dashboard" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">View in Dashboard</a>
                  </div>
                </div>
                <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
                  This order was placed via Sellapage · sellapage.com.ng
                </div>
              </div>
            `,
          )
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("[Checkout Notifications] Error:", error);
  }

  return res.status(200).send("OK");
}
