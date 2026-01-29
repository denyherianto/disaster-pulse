// Firebase messaging service worker for handling background push notifications
// IMPORTANT: Replace the Firebase config values below with your actual Firebase project credentials
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase with config
// TODO: Replace these values with your Firebase project configuration
firebase.initializeApp({
  apiKey: 'AIzaSyAf3gqrPK-y7o_0NvEsYyoI9J3Hse7uoYM',
  authDomain: 'disaster-pulse-7962f.firebaseapp.com',
  projectId: 'disaster-pulse-7962f',
  storageBucket: 'disaster-pulse-7962f.firebasestorage.app',
  messagingSenderId: '1079853583155',
  appId: '1:769725919445:web:d77ad7f8fc6386a845325c',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Disaster Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'New incident reported',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.data?.incidentId || 'disaster-alert',
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  event.notification.close();

  const incidentId = event.notification.data?.incidentId;
  const url = incidentId ? `/incidents/${incidentId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's an existing window to focus
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open a new window if none exists
      return clients.openWindow(url);
    })
  );
});
