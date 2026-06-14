// Master catch-all router for Vercel Hobby tier consolidation

import paystackWebhook from "../src/api-handlers/paystack-webhook.js";
import createSubaccount from "../src/api-handlers/create-subaccount.js";
import resolveAccount from "../src/api-handlers/resolve-account.js";
import shipbubbleRates from "../src/api-handlers/shipbubble-rates.js";
import shipbubbleCreateShipment from "../src/api-handlers/shipbubble-create-shipment.js";
import shipbubbleWebhook from "../src/api-handlers/shipbubble-webhook.js";
import aiDescribe from "../src/api-handlers/ai-describe.js";
import checkoutInitialize from "../src/api-handlers/checkout-initialize.js";
import billingInitialize from "../src/api-handlers/billing-initialize.js";
import validateDiscount from "../src/api-handlers/validate-discount.js";
import submitReview from "../src/api-handlers/submit-review.js";
import markDelivered from "../src/api-handlers/mark-delivered.js";
import deleteAccount from "../src/api-handlers/delete-account.js";
import expiryCron from "../src/api-handlers/expiry-cron.js";
import adminHealth from "../src/api-handlers/admin-health.js";
import notify from "../src/api-handlers/notify.js";
import resetPassword from "../src/api-handlers/reset-password.js";

export default async function handler(req, res) {
  try {
    const { route } = req.query || {};
    const rawEndpoint = route ? route[0] : "";

    // Normalize underscores from frontend requests to hyphens for backend matching
    // (e.g., converts billing_initialize -> billing-initialize)
    const endpoint = rawEndpoint.replace(/_/g, "-");

    switch (endpoint) {
      case "paystack-webhook":
        return await paystackWebhook(req, res);
      case "create-subaccount":
        return await createSubaccount(req, res);
      case "resolve-account":
        return await resolveAccount(req, res);
      case "shipbubble-rates":
        return await shipbubbleRates(req, res);
      case "shipbubble-create-shipment":
        return await shipbubbleCreateShipment(req, res);
      case "shipbubble-webhook":
        return await shipbubbleWebhook(req, res);
      case "ai-describe":
        return await aiDescribe(req, res);
      case "checkout-initialize":
        return await checkoutInitialize(req, res);
      case "billing-initialize":
        return await billingInitialize(req, res);
      case "validate-discount":
        return await validateDiscount(req, res);
      case "submit-review":
        return await submitReview(req, res);
      case "mark-delivered":
        return await markDelivered(req, res);
      case "delete-account":
        return await deleteAccount(req, res);
      case "expiry-cron":
        return await expiryCron(req, res);
      case "admin-health":
        return await adminHealth(req, res);
      case "notify":
        return await notify(req, res);
      case "reset-password":
        return await resetPassword(req, res);
      default:
        res.status(404).json({ error: `Route [${rawEndpoint}] not found` });
        return;
    }
  } catch (err) {
    console.error("[catch-all router] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}