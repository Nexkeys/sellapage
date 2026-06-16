import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "./config";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./config";

let messageListenerInitialized = false;

function setupForegroundHandler() {
  if (messageListenerInitialized) {
    return;
  }

  const messaging = getMessaging(app);

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Sellapage";
    const body = payload.notification?.body || "You have a new notification";

    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
      });
    }
  });

  messageListenerInitialized = true;
}

async function getAndSaveToken(storeId) {
  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    await updateDoc(doc(db, "stores", storeId), { fcmToken: token });
    setupForegroundHandler();
  }

  return token || null;
}

export async function initFCM(storeId) {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return null;
    }

    if (Notification.permission === "denied") {
      return null;
    }

    if (Notification.permission === "default") {
      return "needs-permission";
    }

    if (Notification.permission === "granted") {
      return await getAndSaveToken(storeId);
    }

    return null;
  } catch (error) {
    console.error("[initFCM]", error);
    return null;
  }
}

export async function requestFCMPermission(storeId) {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return null;
    }

    return await getAndSaveToken(storeId);
  } catch (error) {
    console.error("[requestFCMPermission]", error);
    return null;
  }
}
