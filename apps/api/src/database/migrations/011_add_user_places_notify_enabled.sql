-- Migration: Add notify_enabled column to user_places
-- Allows users to enable/disable notifications per saved location

ALTER TABLE user_places 
ADD COLUMN IF NOT EXISTS notify_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN user_places.notify_enabled IS 'Whether to send push notifications for this location';
