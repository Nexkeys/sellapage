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
      case "topship-rates": {
        const { default: handlerFunc } = await import("../src/api-handlers/topship-rates.js");
        return await handlerFunc(req, res);
      }
      case "topship-payment-initialize": {
        const { default: handlerFunc } = await import("../src/api-handlers/topship-payment-initialize.js");
        return await handlerFunc(req, res);
      }
      case "topship-create-shipment": {
        const { default: handlerFunc } = await import("../src/api-handlers/topship-create-shipment.js");
        return await handlerFunc(req, res);
      }
      case "topship-tracking": {
        const { default: handlerFunc } = await import("../src/api-handlers/topship-tracking.js");
        return await handlerFunc(req, res);
      }
      case "topship-countries": {
        const { default: handlerFunc } = await import("../src/api-handlers/topship-countries.js");
        return await handlerFunc(req, res);
      }
      case "ai-describe": {
        const { default: handlerFunc } = await import("../src/api-handlers/ai-describe.js");
        return await handlerFunc(req, res);
      }
      case "sella-ai": {
        const { default: handlerFunc } = await import("../src/api-handlers/sella-ai.js");
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
      case "verify-transaction": {
        const { default: handlerFunc } = await import("../src/api-handlers/verify-transaction.js");
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
      case "booking-reminder-cron": {
        const { default: handlerFunc } = await import("../src/api-handlers/booking-reminder-cron.js");
        return await handlerFunc(req, res);
      }
      case "platform-review-submit": {
        const { default: handlerFunc } = await import("../src/api-handlers/platform-review-submit.js");
        return await handlerFunc(req, res);
      }
      case "platform-reviews-admin": {
        const { default: handlerFunc } = await import("../src/api-handlers/platform-reviews-admin.js");
        return await handlerFunc(req, res);
      }
      case "platform-reviews-public": {
        const { default: handlerFunc } = await import("../src/api-handlers/platform-reviews-public.js");
        return await handlerFunc(req, res);
      }
      case "receipt-create": {
        const { default: handlerFunc } = await import("../src/api-handlers/receipt-create.js");
        return await handlerFunc(req, res);
      }
      case "receipt-update": {
        const { default: handlerFunc } = await import("../src/api-handlers/receipt-update.js");
        return await handlerFunc(req, res);
      }
      case "receipt-delete": {
        const { default: handlerFunc } = await import("../src/api-handlers/receipt-delete.js");
        return await handlerFunc(req, res);
      }
      case "receipt-list": {
        const { default: handlerFunc } = await import("../src/api-handlers/receipt-list.js");
        return await handlerFunc(req, res);
      }
      case "receipt-settings": {
        const { default: handlerFunc } = await import("../src/api-handlers/receipt-settings.js");
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
      case "sessions": {
        const { default: handlerFunc } = await import("../src/api-handlers/sessions.js");
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
      case "update-booking-status": {
        const { default: handler } = await import("../src/api-handlers/update-booking-status.js")
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
      case "referral-generate-code": {
        const { default: handler } = await import("../src/api-handlers/referral-generate-code.js")
        return handler(req, res)
      }
      case "referral-track": {
        const { default: handler } = await import("../src/api-handlers/referral-track.js")
        return handler(req, res)
      }
      case "referral-resolve-code": {
        const { default: handler } = await import("../src/api-handlers/referral-resolve-code.js")
        return handler(req, res)
      }
      case "get-banks": {
        const { default: handler } = await import("../src/api-handlers/get-banks.js")
        return handler(req, res)
      }
      case "referral-bank-save": {
        const { default: handler } = await import("../src/api-handlers/referral-bank-save.js")
        return handler(req, res)
      }
      case "referral-withdraw-request": {
        const { default: handler } = await import("../src/api-handlers/referral-withdraw-request.js")
        return handler(req, res)
      }
      case "referral-stats": {
        const { default: handler } = await import("../src/api-handlers/referral-stats.js")
        return handler(req, res)
      }
      case "referral-withdrawals": {
        const { default: handler } = await import("../src/api-handlers/referral-withdrawals.js")
        return handler(req, res)
      }
      case "admin-referrals": {
        const { default: handler } = await import("../src/api-handlers/admin-referrals.js")
        return handler(req, res)
      }
      case "admin-manage": {
        const { default: handler } = await import("../src/api-handlers/admin-manage.js")
        return handler(req, res)
      }
      case "referral-signup": {
        const { default: handler } = await import("../src/api-handlers/referral-signup.js")
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
      case "google-ads-disconnect": {
        const { default: handler } = await import("../src/api-handlers/google-ads-disconnect.js")
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

      case "admin-cac": {
        const { default: handler } = await import("../src/api-handlers/admin-cac.js")
        return handler(req, res)
      }
      case "admin-domains": {
        const { default: handler } = await import("../src/api-handlers/admin-domains.js")
        return handler(req, res)
      }
      case "admin-flags": {
        const { default: handler } = await import("../src/api-handlers/admin-flags.js")
        return handler(req, res)
      }
      case "admin-tickets": {
        const { default: handler } = await import("../src/api-handlers/admin-tickets.js")
        return handler(req, res)
      }
      case "admin-analytics": {
        const { default: handler } = await import("../src/api-handlers/admin-analytics.js")
        return handler(req, res)
      }
      case "admin-announcements": {
        const { default: handler } = await import("../src/api-handlers/admin-announcements.js")
        return handler(req, res)
      }
      case "admin-revenue": {
        const { default: handler } = await import("../src/api-handlers/admin-revenue.js")
        return handler(req, res)
      }
      case "admin-sella-ai": {
        const { default: handler } = await import("../src/api-handlers/admin-sella-ai.js")
        return handler(req, res)
      }

      case "submit-report": {
        const { default: handler } = await import("../src/api-handlers/submit-report.js")
        return handler(req, res)
      }
      case "admin-reports": {
        const { default: handler } = await import("../src/api-handlers/admin-reports.js")
        return handler(req, res)
      }

      case "job-listings": {
        const { default: handler } = await import("../src/api-handlers/job-listings.js")
        return handler(req, res)
      }
      case "jobs-public": {
        const { default: handler } = await import("../src/api-handlers/jobs-public.js")
        return handler(req, res)
      }

      // Loyalty. Public (storefront checkout) and vendor (dashboard tab) are
      // separate handlers on purpose, so the unauthenticated path can never
      // share a file with the authenticated one.
      case "loyalty-public": {
        const { default: handler } = await import("../src/api-handlers/loyalty-public.js")
        return handler(req, res)
      }
      case "loyalty-vendor": {
        const { default: handler } = await import("../src/api-handlers/loyalty-vendor.js")
        return handler(req, res)
      }
      case "admin-jobs": {
        const { default: handler } = await import("../src/api-handlers/admin-jobs.js")
        return handler(req, res)
      }

      case "blog-admin": {
        const { default: handler } = await import("../src/api-handlers/blog-admin.js")
        return handler(req, res)
      }
      case "blog-public": {
        const { default: handler } = await import("../src/api-handlers/blog-public.js")
        return handler(req, res)
      }

      case "product-feed": {
        const { default: handler } = await import("../src/api-handlers/product-feed.js")
        return await handler(req, res)
      }
      case "store-seo": {
        const { default: handler } = await import("../src/api-handlers/store-seo.js")
        return await handler(req, res)
      }
      case "storefront-render": {
        const { default: handler } = await import("../src/api-handlers/storefront-render.js")
        return await handler(req, res)
      }
      case "sitemap": {
        const { default: handler } = await import("../src/api-handlers/sitemap.js")
        return handler(req, res)
      }

      case "staff-roles": {
        const { default: handler } = await import("../src/api-handlers/staff-roles.js")
        return handler(req, res)
      }
      case "staff-invites": {
        const { default: handler } = await import("../src/api-handlers/staff-invites.js")
        return handler(req, res)
      }
      case "staff-join": {
        const { default: handler } = await import("../src/api-handlers/staff-join.js")
        return handler(req, res)
      }
      case "staff-manage": {
        const { default: handler } = await import("../src/api-handlers/staff-manage.js")
        return handler(req, res)
      }
      case "staff-identity": {
        const { default: handler } = await import("../src/api-handlers/staff-identity.js")
        return handler(req, res)
      }
      case "store-data": {
        const { default: handler } = await import("../src/api-handlers/store-data.js")
        return handler(req, res)
      }
      case "store-write": {
        const { default: handler } = await import("../src/api-handlers/store-write.js")
        return handler(req, res)
      }
      case "otp-send": {
        const { default: handler } = await import("../src/api-handlers/otp-send.js")
        return handler(req, res)
      }
      case "otp-verify": {
        const { default: handler } = await import("../src/api-handlers/otp-verify.js")
        return handler(req, res)
      }
      case "admin-termii": {
        const { default: handler } = await import("../src/api-handlers/admin-termii.js")
        return handler(req, res)
      }
      case "account-recovery": {
        const { default: handler } = await import("../src/api-handlers/account-recovery.js")
        return handler(req, res)
      }
      case "admin-recovery": {
        const { default: handler } = await import("../src/api-handlers/admin-recovery.js")
        return handler(req, res)
      }
      case "phone-verify": {
        const { default: handler } = await import("../src/api-handlers/phone-verify.js")
        return handler(req, res)
      }
      case "login-verify": {
        const { default: handler } = await import("../src/api-handlers/login-verify.js")
        return handler(req, res)
      }
      case "public-config": {
        const { default: handler } = await import("../src/api-handlers/public-config.js")
        return handler(req, res)
      }
      case "login-attempt": {
        const { default: handler } = await import("../src/api-handlers/login-attempt.js")
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