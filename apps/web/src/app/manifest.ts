import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Disaster Pulse',
    short_name: 'DisasterPulse',
    description: 'Real-time disaster monitoring and alerts for Indonesia',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    // Required for Firebase Cloud Messaging
    // @ts-expect-error gcm_sender_id is a valid manifest field for FCM
    gcm_sender_id: '103953800507',
  };
}

