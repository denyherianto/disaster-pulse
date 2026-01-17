-- Migration: Add push notification subscriptions table
-- Stores FCM tokens for each user's devices

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- FCM token (unique per device/browser)
  fcm_token TEXT NOT NULL,
  
  -- Device metadata for debugging
  device_info JSONB,
  
  -- Track token validity
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each token should be unique
  UNIQUE(fcm_token)
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx ON push_subscriptions(is_active) WHERE is_active = true;

COMMENT ON TABLE push_subscriptions IS 'Stores FCM tokens for PWA push notifications';
COMMENT ON COLUMN push_subscriptions.fcm_token IS 'Firebase Cloud Messaging token for the device';
COMMENT ON COLUMN push_subscriptions.device_info IS 'Browser/device info for debugging (user agent, etc)';
