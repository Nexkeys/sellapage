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
      case "sendbox-webhook": {
        const { default: handler } = await import("../src/api-handlers/sendbox-webhook.js")
        return handler(req, res)
      }
      case "sendbox-payment-initialize": {
        const { default: handlerFunc } = await import("../src/api-handlers/sendbox-payment-initialize.js");
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
      case "update-order-status": {
        const { default: handler } = await import("../src/api-handlers/update-order-status.js")
        return handler(req, res)
      }
      case "add-custom-domain": {
        const { default: handler } = await import("../src/api-handlers/add-custom-domain.js")
        return handler(req, res)
      }
      case "remove-custom-domain": {
        const { default: handler } = await import("../src/api-handlers/remove-custom-domain.js")
        return handler(req, res)
      }
      case "verify-custom-domain": {
        const { default: handler } = await import("../src/api-handlers/verify-custom-domain.js")
        return handler(req, res)
      }
      case "resolve-domain": {
        const { default: handler } = await import("../src/api-handlers/resolve-domain.js")
        return handler(req, res)
      }
      case "public-resolve-domain": {
        const { default: handler } = await import("../src/api-handlers/public-resolve-domain.js")
        return handler(req, res)
      }
      case "verify-cac": {
        const { default: handler } = await import("../src/api-handlers/verify-cac.js")
        return handler(req, res)
      }

      case "google-ads-auth": {
        const { default: handler } = await import("../src/api-handlers/google-ads-auth.js")
        return handler(req, res)
      }
      case "google-ads-callback": {
        const { default: handler } = await import("../src/api-handlers/google-ads-callback.js")
        return handler(req, res)
      }
      case "google-ads-accounts": {
        const { default: handler } = await import("../src/api-handlers/google-ads-accounts.js")
        return handler(req, res)
      }
      case "google-ads-campaigns": {
        const { default: handler } = await import("../src/api-handlers/google-ads-campaigns.js")
        return handler(req, res)
      }
      case "google-ads-reports": {
        const { default: handler } = await import("../src/api-handlers/google-ads-reports.js")
        return handler(req, res)
      }

      case "google-ads-master-auth": {
        const { default: handler } = await import("../src/api-handlers/google-ads-master-auth.js")
        return handler(req, res)
      }
      case "google-ads-master-callback": {
        const { default: handler } = await import("../src/api-handlers/google-ads-master-callback.js")
        return handler(req, res)
      }

      case "ads-payment-initialize": {
        const { default: handler } = await import("../src/api-handlers/ads-payment-initialize.js")
        return handler(req, res)
      }
      case "ads-payment-verify": {
        const { default: handler } = await import("../src/api-handlers/ads-payment-verify.js")
        return handler(req, res)
      }

      default:
        return res.status(404).json({ error: `Route [${rawEndpoint || "empty"}] not found` });
    }
  } catch (err) {
    console.error("[catch-all router] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}