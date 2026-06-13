import { getMessaging, getToken } from 'firebase/messaging';
import app from './config';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

export async function initFCM(storeId, updateStoreDoc) {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return null;
    }

    const permission = Notification.permission;

    if (permission === 'denied') {
      return null;
    }

    if (permission === 'default') {
      return 'needs-permission';
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await updateDoc(doc(db, 'stores', storeId), { fcmToken: token });
    }

    return token;
  } catch (error) {
    console.error('[initFCM]', error);
    return null;
  }
}

export async function requestFCMPermission(storeId, updateStoreDoc) {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return null;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await updateDoc(doc(db, 'stores', storeId), { fcmToken: token });
    }

    return token;
  } catch (error) {
    console.error('[requestFCMPermission]', error);
    return null;
  }
}