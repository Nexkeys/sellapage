//src/api-handlers/_lib/send-push.js/
//
// The LEGACY single-token sender, kept for the web dashboard's own push token
// on stores/{storeId}.fcmToken. The multi-device path for the mobile app is
// _lib/push-devices.js.
//
// DUPLICATE SUPPRESSION: stores that installed an early app build still have
// the APP's token sitting in stores.fcmToken, and six call sites fire both this
// and notifyStore for the same event. Those phones got every one of those
// notifications twice. Any token that is also a live row in `devices` is
// therefore skipped here, because the registry has already delivered to it.
//
// This also closes a quieter hole: a push suppressed by the plan gate, the
// staff filter or a muted channel would still have gone out on this path,
// because nothing here knows about any of those rules.
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getAdminDb } from './firebase-admin.js';
import { DEVICES, deviceIdFor } from './push-devices.js';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

/**
 * Whether this exact token is a live device in the registry.
 *
 * One document get, not a query: the device id is the SHA-256 of the token, so
 * the row is addressable directly. Fails OPEN - if the lookup throws we send,
 * because a duplicate notification is a far smaller failure than a missing one.
 */
async function isRegisteredDevice(fcmToken) {
  try {
    const snap = await getAdminDb().collection(DEVICES).doc(deviceIdFor(fcmToken)).get();
    if (!snap.exists) return false;
    return !snap.data()?.disabledAt;
  } catch (err) {
    console.error('[send-push] registry check failed:', err?.message || err);
    return false;
  }
}

export async function sendPush(fcmToken, title, body, data = {}) {
  try {
    if (!fcmToken) {
      console.warn('[send-push] No FCM token provided, skipping push');
      return false;
    }

    if (await isRegisteredDevice(fcmToken)) {
      console.log('[send-push] token is a registered device, skipping legacy push');
      return false;
    }

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
        },
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };

    await getMessaging().send(message);
    return true;
  } catch (error) {
    console.error('[send-push]', error.message);
    return false;
  }
}