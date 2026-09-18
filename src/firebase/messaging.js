import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "./config";
import { auth } from "./auth";

// A stable id for this browser, so a rotated token replaces its predecessor in
// the device registry instead of piling up beside it. Same role as the app's
// installId. Falls back to a per-session id where storage is blocked.
function browserInstallId() {
  const KEY = "sp_install_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = `web-${crypto.randomUUID()}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `web-${Date.now()}`;
  }
}

/**
 * Registers this browser's push token in the server-side device registry.
 *
 * It used to be written to stores/{storeId}.fcmToken, which is a PUBLIC
 * document (storefronts read it), so every vendor's push token was readable by
 * anyone. It also failed silently for staff, whose uid can never write the
 * store document, so staff on the web never received a push at all. The
 * registry fixes both: it is server-only, and the same staff routing that
 * governs the app applies here too.
 */
async function registerWebToken(token) {
  const user = auth.currentUser;
  if (!user) return;
  const idToken = await user.getIdToken();
  const res = await fetch("/api/device-register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      token,
      platform: "web",
      installId: browserInstallId(),
      appVersion: "web",
    }),
  });
  if (!res.ok) throw new Error(`device-register ${res.status}`);
}

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

// storeId is kept in the signature for the existing call sites; the server
// derives the store from the signed-in user and never trusts one from here.
// eslint-disable-next-line no-unused-vars
async function getAndSaveToken(storeId) {
  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    await registerWebToken(token);
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
