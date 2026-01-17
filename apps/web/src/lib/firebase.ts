import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is properly configured
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  );
}

// Initialize Firebase only once (only if configured)
let app: ReturnType<typeof initializeApp> | null = null;
if (isFirebaseConfigured()) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

let messaging: Messaging | null = null;

export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!isFirebaseConfigured() || !app) {
    console.warn('Firebase is not configured. Push notifications disabled.');
    return null;
  }
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Failed to initialize Firebase Messaging:', error);
      return null;
    }
  }
  return messaging;
}

export async function requestNotificationPermission(): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured. Please add Firebase environment variables.');
    throw new Error('Firebase belum dikonfigurasi. Hubungi administrator.');
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      throw new Error('Firebase Messaging tidak tersedia');
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      throw new Error('VAPID key tidak dikonfigurasi');
    }

    const token = await getToken(messaging, { vapidKey });

    console.log('FCM Token obtained');
    return token;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    throw error;
  }
}

export function onForegroundMessage(callback: (payload: any) => void): () => void {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}
