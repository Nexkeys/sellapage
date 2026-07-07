//sellapage/api/[...route].js/
// Master catch-all router for Vercel Hobby tier consolidation

export default async function handler(req, res) {
  try {
    let rawEndpoint = "";

    // 1. Try reading from Vercel's native query parameters
    if (req.query && req.query.route && req.query.route[0]) {
      rawEndpoint = req.query.route[0];
    }

    // 2. Fallback: Parse the raw URL directly to bypass vercel.json rewrite edge cases
    if (!rawEndpoint && req.url) {
      const urlPath = req.url.split("?")[0]; // Remove any query strings
      const segments = urlPath.split("/").filter(Boolean); // Split and clear empty spaces
      
      if (segments[0] === "api" && segments[1]) {
        rawEndpoint = segments[1];
      } else if (segments[0]) {
        rawEndpoint = segments[0];
      }
    }

    // Normalize underscores from frontend requests to hyphens for matching
    const endpoint = rawEndpoint.replace(/_/g, "-");

    // Dynamic Imports prevent a single broken handler from crashing the entire app on boot
    switch (endpoint) {
      case "paystack-webhook": {
        const { default: handlerFunc } = await import("../src/api-handlers/paystack-webhook.js");
        return await handlerFunc(req, res);
      }
      case "create-subaccount": {
        const { default: handlerFunc } = await import("../src/api-handlers/create-subaccount.js");
        return await handlerFunc(req, res);
      }
      case "resolve-account": {
        const { default: handlerFunc } = await import("../src/api-handlers/resolve-account.js");
        return await handlerFunc(req, res);
      }
      case "sendbox-rates": {
        const { default: handlerFunc } = await import("../src/api-handlers/sendbox-rates.js");
        return await handlerFunc(req, res);
      }
      case "sendbox-create-shipment": {
        const { default: handlerFunc } = await import("../src/api-handlers/sendbox-create-shipment.js");
        return await handlerFunc(req, res);
      }
      case "shipbubble-webhook": {
        const { default: handlerFunc } = await import("../src/api-handlers/shipbubble-webhook.js");
        return await handlerFunc(req, res);
      }
      case "ai-describe": {
        const { default: handlerFunc } = await import("../src/api-handlers/ai-describe.js");
        return await handlerFunc(req, res);
      }
      case "checkout-initialize": {
        const { default: handlerFunc } = await import("../src/api-handlers/checkout-initialize.js");
        return await handlerFunc(req, res);
      }
      case "billing-initialize": {
        const { default: handlerFunc } = await import("../src/api-handlers/billing-initialize.js");
        return await handlerFunc(req, res);
      }
      case "validate-discount": {
        const { default: handlerFunc } = await import("../src/api-handlers/validate-discount.js");
        return await handlerFunc(req, res);
      }
      case "submit-review": {
        const { default: handlerFunc } = await import("../src/api-handlers/submit-review.js");
        return await handlerFunc(req, res);
      }
      case "mark-delivered": {
        const { default: handlerFunc } = await import("../src/api-handlers/mark-delivered.js");
        return await handlerFunc(req, res);
      }
      case "delete-account": {
        const { default: handlerFunc } = await import("../src/api-handlers/delete-account.js");
        return await handlerFunc(req, res);
      }
      case "expiry-cron": {
        const { default: handlerFunc } = await import("../src/api-handlers/expiry-cron.js");
        return await handlerFunc(req, res);
      }
      case "admin-health": {
        const { default: handlerFunc } = await import("../src/api-handlers/admin-health.js");
        return await handlerFunc(req, res);
      }
      case "notify": {
        const { default: handlerFunc } = await import("../src/api-handlers/notify.js");
        return await handlerFunc(req, res);
      }
      case "reset-password": {
        const { default: handlerFunc } = await import("../src/api-handlers/reset-password.js");
        return await handlerFunc(req, res);
      }

      case "sendbox-tracking": {
        const { default: handlerFunc } = await import("../src/api-handlers/sendbox-tracking.js");
        return await handlerFunc(req, res);
      }


      default:
        return res.status(404).json({ error: `Route [${rawEndpoint || "empty"}] not found` });
    }
  } catch (err) {
    console.error("[catch-all router] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}