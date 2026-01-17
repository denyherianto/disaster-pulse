import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { SupabaseService } from '../supabase/supabase.service';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async onModuleInit() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      const serviceAccountBase64 = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_BASE64');
      
      if (serviceAccountBase64) {
        try {
          const serviceAccount = JSON.parse(
            Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
          );
          
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          
          this.logger.log('Firebase Admin SDK initialized successfully');
        } catch (error) {
          this.logger.error('Failed to initialize Firebase Admin SDK:', error);
        }
      } else {
        this.logger.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 not configured, push notifications disabled');
      }
    }
  }

  private get db() {
    // Cast to any since push_subscriptions table isn't in generated types yet
    return this.supabase.getClient() as any;
  }

  /**
   * Subscribe a user device to push notifications
   */
  async subscribe(userId: string, fcmToken: string, deviceInfo?: Record<string, any>): Promise<boolean> {
    try {
      const { error } = await this.db
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            fcm_token: fcmToken,
            device_info: deviceInfo,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'fcm_token' }
        );

      if (error) {
        this.logger.error('Failed to subscribe:', error);
        return false;
      }

      this.logger.log(`User ${userId} subscribed to push notifications`);
      return true;
    } catch (error) {
      this.logger.error('Error in subscribe:', error);
      return false;
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      const { error } = await this.db
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Failed to unsubscribe:', error);
        return false;
      }

      this.logger.log(`User ${userId} unsubscribed from push notifications`);
      return true;
    } catch (error) {
      this.logger.error('Error in unsubscribe:', error);
      return false;
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<number> {
    const { data: subscriptions } = await this.db
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!subscriptions?.length) {
      this.logger.debug(`No active subscriptions for user ${userId}`);
      return 0;
    }

    const tokens = subscriptions.map((s: any) => s.fcm_token);
    return this.sendToTokens(tokens, payload);
  }

  /**
   * Send push notification to users in a specific area (by user_places)
   */
  async sendToUsersInArea(
    lat: number,
    lng: number,
    radiusM: number,
    payload: NotificationPayload,
    eventType?: string,
  ): Promise<number> {
    // Find users with places near the incident location
    const { data: userPlaces } = await this.db
      .from('user_places')
      .select(`
        user_id,
        user_place_preferences (
          notify_flood,
          notify_earthquake,
          notify_landslide,
          notify_fire,
          notify_power_outage,
          min_confidence
        )
      `)
      .eq('is_active', true);

    if (!userPlaces?.length) {
      return 0;
    }

    // Filter by event type preference and get unique user IDs
    const eligibleUserIds = new Set<string>();
    
    for (const place of userPlaces) {
      const prefs = (place as any).user_place_preferences;
      
      // Check if user wants notifications for this event type
      if (eventType && prefs) {
        const prefKey = `notify_${eventType}` as keyof typeof prefs;
        if (prefs[prefKey] === false) continue;
      }
      
      eligibleUserIds.add(place.user_id);
    }

    // Get active FCM tokens for eligible users
    const { data: subscriptions } = await this.db
      .from('push_subscriptions')
      .select('fcm_token')
      .in('user_id', Array.from(eligibleUserIds))
      .eq('is_active', true);

    if (!subscriptions?.length) {
      return 0;
    }

    const tokens = subscriptions.map((s: any) => s.fcm_token);
    return this.sendToTokens(tokens, payload);
  }

  /**
   * Send push notification to all subscribed users
   */
  async sendToAllUsers(payload: NotificationPayload): Promise<number> {
    const { data: subscriptions } = await this.db
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('is_active', true);

    if (!subscriptions?.length) return 0;

    const tokens = subscriptions.map((s: any) => s.fcm_token);
    return this.sendToTokens(tokens, payload);
  }

  /**
   * Send push notification to multiple tokens
   */
  private async sendToTokens(tokens: string[], payload: NotificationPayload): Promise<number> {
    if (!admin.apps.length) {
      this.logger.warn('Firebase Admin not initialized, skipping push notification');
      return 0;
    }

    if (tokens.length === 0) return 0;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        webpush: {
          fcmOptions: {
            link: payload.data?.link || '/',
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      this.logger.log(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`);

      // Handle invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await this.deactivateTokens(invalidTokens);
        }
      }

      return response.successCount;
    } catch (error) {
      this.logger.error('Error sending push notifications:', error);
      return 0;
    }
  }

  /**
   * Deactivate invalid tokens
   */
  private async deactivateTokens(tokens: string[]): Promise<void> {
    try {
      await this.db
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('fcm_token', tokens);

      this.logger.log(`Deactivated ${tokens.length} invalid FCM tokens`);
    } catch (error) {
      this.logger.error('Error deactivating tokens:', error);
    }
  }

  /**
   * Send notification for a new/updated incident
   */
  async notifyIncident(incident: {
    id: string;
    city: string;
    event_type: string;
    severity: string;
    status: string;
    summary?: string;
    lat?: number;
    lng?: number;
  }): Promise<number> {
    const eventTypeLabels: Record<string, string> = {
      flood: '🌊 Banjir',
      earthquake: '🌍 Gempa Bumi',
      landslide: '⛰️ Tanah Longsor',
      fire: '🔥 Kebakaran',
      power_outage: '💡 Pemadaman Listrik',
      other: '⚠️ Kejadian',
    };

    const severityLabels: Record<string, string> = {
      low: 'Rendah',
      medium: 'Sedang',
      high: 'Tinggi',
    };

    const title = `${eventTypeLabels[incident.event_type] || '⚠️ Kejadian'} - ${incident.city}`;
    const body = incident.summary || 
      `${eventTypeLabels[incident.event_type] || 'Kejadian'} terdeteksi di ${incident.city}. Tingkat: ${severityLabels[incident.severity] || incident.severity}`;

    const payload: NotificationPayload = {
      title,
      body,
      data: {
        incidentId: incident.id,
        eventType: incident.event_type,
        severity: incident.severity,
        city: incident.city,
        link: `/incidents/${incident.id}`,
      },
    };

    // If we have coordinates, notify users in the area
    if (incident.lat && incident.lng) {
      return this.sendToUsersInArea(
        incident.lat,
        incident.lng,
        50000, // 50km radius
        payload,
        incident.event_type,
      );
    }

    // Otherwise, send to all subscribed users (fallback)
    return this.sendToAllUsers(payload);
  }
}
