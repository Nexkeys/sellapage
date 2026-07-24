// scripts/migrate-bookings.js
//
// One-time migration: copies legacy stores/{storeId}/orders docs with
// orderType === 'booking' into the new stores/{storeId}/bookings collection,
// extracting structured bookingDate/bookingTime/location fields out of the old
// freeform `notes` string where possible.
//
// This is copy-and-mark-migrated, NOT delete: the original order doc is left in
// place and patched with { migratedToBookings: true, migratedAt }. A separate,
// later cleanup pass (run only after a few days of production observation and
// manual spot-checking) is responsible for deleting the flagged originals.
//
// Usage (run locally, never as a deployed API route):
//   node --env-file=.env scripts/migrate-bookings.js --dry-run
//   node --env-file=.env scripts/migrate-bookings.js --dry-run --store=<storeId>
//   node --env-file=.env scripts/migrate-bookings.js --store=<storeId>
//   node --env-file=.env scripts/migrate-bookings.js
//
// Requires FIREBASE_SERVICE_ACCOUNT in the environment (same JSON-string
// credential the Vercel functions use). Use `--env-file=.env` (Node 20.6+) to
// load it from your local .env, or export it in your shell first.
//
// Always run --dry-run first and eyeball the summary before doing a real run.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const storeArg = args.find((a) => a.startsWith("--store="));
const singleStoreId = storeArg ? storeArg.split("=")[1] : null;

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error(
    "FIREBASE_SERVICE_ACCOUNT is not set. Run with `node --env-file=.env scripts/migrate-bookings.js` or export it first.",
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = getFirestore();

// Matches the exact freeform notes format written by the pre-refactor
// ServiceStorePage.jsx booking checkout (see git history of that file):
//   Date: 2026-07-24
//   Time: 14:30
//   Location Preference: Online
//   Notes: whatever the customer typed
function extractFromNotes(notes) {
  const text = typeof notes === "string" ? notes : "";
  const dateMatch = text.match(/^Date:\s*(.+)$/m);
  const timeMatch = text.match(/^Time:\s*(.+)$/m);
  const locationMatch = text.match(/^Location Preference:\s*(.+)$/m);
  const notesMatch = text.match(/^Notes:\s*([\s\S]+)$/m);

  return {
    bookingDate: dateMatch ? dateMatch[1].trim() : null,
    bookingTime: timeMatch ? timeMatch[1].trim() : null,
    locationPref: locationMatch ? locationMatch[1].trim() : "",
    extractedNotes: notesMatch ? notesMatch[1].trim() : "",
  };
}

// Conservative status remap into the new booking vocabulary. Statuses that make
// no sense for a booking (dispatched/in_transit — shipping-only) collapse to
// 'confirmed' and get flagged in the summary for manual review.
function mapStatus(oldStatus) {
  switch (oldStatus) {
    case "delivered":
      return { status: "completed", flagged: false };
    case "dispatched":
    case "in_transit":
      return { status: "confirmed", flagged: true };
    case "pending":
    case "confirmed":
    case "cancelled":
      return { status: oldStatus, flagged: false };
    default:
      return { status: "pending", flagged: true };
  }
}

async function migrateStore(storeId, summary) {
  const ordersSnap = await db
    .collection("stores")
    .doc(storeId)
    .collection("orders")
    .where("orderType", "==", "booking")
    .get();

  if (ordersSnap.empty) return;

  for (const orderDoc of ordersSnap.docs) {
    const order = orderDoc.data();

    if (order.migratedToBookings === true) {
      continue; // already migrated in a previous run
    }

    const extracted = extractFromNotes(order.notes);
    const firstCartItem = Array.isArray(order.cartItems) ? order.cartItems[0] : null;

    const serviceName = firstCartItem?.name || order.items || "";
    const servicePrice = firstCartItem?.price != null ? Number(firstCartItem.price) : null;

    const { status: mappedStatus, flagged: statusFlagged } = mapStatus(order.status);
    const extractionFailed = !extracted.bookingDate || !extracted.bookingTime;

    const bookingDoc = {
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      customerEmail: order.customerEmail || "",
      serviceId: firstCartItem?.id || "",
      serviceName,
      servicePrice: servicePrice != null ? servicePrice : 0,
      locationType: "",
      locationPref: extracted.locationPref,
      bookingDate: extracted.bookingDate,
      bookingTime: extracted.bookingTime,
      customerNotes: extracted.extractedNotes,
      legacyNotes: order.notes || "",
      processingFee: order.processingFee || 0,
      discountAmount: order.discountAmount || 0,
      promoCode: order.promoCode || "",
      grandTotal: order.grandTotal || order.total || 0,
      paystackReference: order.paystackReference || "",
      paystackAmount: order.paystackAmount || 0,
      paymentStatus: order.paymentStatus || "paid",
      paymentMethod: order.paymentMethod || "card",
      status: mappedStatus,
      legacyStatus: order.status || "",
      legacyStatusLog: order.statusLog || [],
      itemType: "service",
      itemId: order.itemId || firstCartItem?.id || "",
      reviewToken: order.reviewToken || null,
      reviewTokenUsed: order.reviewTokenUsed || false,
      reviewSubmitted: order.reviewSubmitted || false,
      createdAt: order.createdAt || Timestamp.now(),
      migratedFromOrderId: orderDoc.id,
      migratedAt: Timestamp.now(),
      statusLog: [{
        status: mappedStatus,
        changedAt: new Date().toISOString(),
        changedBy: "migration-script",
        changedByLabel: "Migrated from orders",
      }],
    };

    summary.push({
      storeId,
      orderId: orderDoc.id,
      extractionFailed,
      statusFlagged,
      legacyStatus: order.status || "",
      mappedStatus,
    });

    if (isDryRun) {
      console.log(`[dry-run] would migrate ${storeId}/orders/${orderDoc.id} -> bookings/${orderDoc.id}`, {
        extractionFailed,
        statusFlagged,
      });
      continue;
    }

    const bookingRef = db
      .collection("stores")
      .doc(storeId)
      .collection("bookings")
      .doc(orderDoc.id);

    await bookingRef.set(bookingDoc);
    await orderDoc.ref.update({
      migratedToBookings: true,
      migratedAt: Timestamp.now(),
    });

    console.log(`Migrated ${storeId}/orders/${orderDoc.id} -> bookings/${orderDoc.id}`);
  }
}

async function main() {
  const summary = [];

  if (singleStoreId) {
    await migrateStore(singleStoreId, summary);
  } else {
    const storesSnap = await db.collection("stores").get();
    for (const storeDoc of storesSnap.docs) {
      await migrateStore(storeDoc.id, summary);
    }
  }

  const outDir = `${__dirname}/migration-output`;
  mkdirSync(outDir, { recursive: true });
  const outFile = `${outDir}/migrate-bookings-${isDryRun ? "dry-run-" : ""}${Date.now()}.json`;
  writeFileSync(outFile, JSON.stringify(summary, null, 2));

  const failedExtraction = summary.filter((s) => s.extractionFailed);
  const flaggedStatus = summary.filter((s) => s.statusFlagged);

  console.log(`\nDone. ${summary.length} booking order(s) ${isDryRun ? "would be " : ""}migrated.`);
  console.log(`  ${failedExtraction.length} with failed bookingDate/bookingTime extraction (needs manual backfill).`);
  console.log(`  ${flaggedStatus.length} with a status that doesn't map cleanly (needs manual review).`);
  console.log(`Summary written to ${outFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate-bookings] fatal error", err);
    process.exit(1);
  });
