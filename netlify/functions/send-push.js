import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

export async function sendPush(fcmToken, title, body, data = {}) {
  try {
    if (!fcmToken) {
      console.warn('[send-push] No FCM token provided, skipping push');
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