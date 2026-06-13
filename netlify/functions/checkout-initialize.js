//sellapage/netlify/functions/checkout-initialize.js/
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = getFirestore();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const calcProcessingFee = (subtotal) =>
  Math.min(Math.ceil(subtotal * 0.015) + 100, 2000);

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
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
  } = body;

  if (
    !storeId ||
    !customerName?.trim() ||
    !customerEmail?.trim() ||
    !customerPhone?.trim() ||
    !Array.isArray(cartItems) ||
    cartItems.length === 0 ||
    deliveryFee == null ||
    !deliveryAddress ||
    typeof deliveryAddress !== "object"
  ) {
    return jsonResponse(400, {
      error:
        "Missing required fields: storeId, customerName, customerEmail, customerPhone, cartItems, deliveryFee, deliveryAddress",
    });
  }

  const parsedDeliveryFee = Number(deliveryFee);
  if (Number.isNaN(parsedDeliveryFee) || parsedDeliveryFee < 0) {
    return jsonResponse(400, { error: "deliveryFee must be a number >= 0" });
  }

  for (const item of cartItems) {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);
    if (Number.isNaN(price) || Number.isNaN(quantity) || quantity <= 0) {
      return jsonResponse(400, {
        error: "Each cart item must have a valid price and quantity > 0",
      });
    }
  }

  let storeDoc;
  try {
    storeDoc = await db.collection("stores").doc(storeId).get();
  } catch {
    return jsonResponse(500, { error: "Failed to fetch store from Firestore" });
  }

  if (!storeDoc.exists) {
    return jsonResponse(404, { error: "Store not found" });
  }

  const store = storeDoc.data();

  if (!store.subaccountCode) {
    return jsonResponse(400, {
      error:
        "Store has not set up payment receiving. Please contact the seller.",
    });
  }

  const email = store.email;
  if (!email) {
    return jsonResponse(400, { error: "Store has no email address on file" });
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );
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
            cartItems: JSON.stringify(cartItems),
            deliveryFee: parsedDeliveryFee,
            processingFee,
            grandTotal,
            promoCode,
            discountAmount: parsedDiscountAmount,
            deliveryAddress: JSON.stringify(deliveryAddress),
            notes: notes || "",
            transactionType: "checkout",
            orderType: orderType || "checkout",
          },
        }),
      },
    );
  } catch {
    return jsonResponse(502, { error: "Failed to reach Paystack API" });
  }

  const paystackData = await paystackResponse.json();

  if (!paystackResponse.ok || !paystackData.status) {
    return jsonResponse(502, {
      error:
        paystackData.message || "Paystack transaction initialization failed",
    });
  }

  return jsonResponse(200, {
    authorization_url: paystackData.data.authorization_url,
    reference: paystackData.data.reference,
  });
};
