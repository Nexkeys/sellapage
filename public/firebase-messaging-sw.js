importScripts(
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: 'AIzaSyDkXiKPs1Jz42dtB0N_gKH7MCG2pJpjI-A',
  authDomain: 'sellapage-7145d.firebaseapp.com',
  projectId: 'sellapage-7145d',
  storageBucket: 'sellapage-7145d.firebasestorage.app',
  messagingSenderId: '1086263211993',
  appId: '1:1086263211993:web:fd4df15a9a9c3f5a0acbc8',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'Sellapage';
  const body = notification.body || 'You have a new notification';

  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
  });
});