-- Add bmkg to signals source enum
ALTER TABLE signals DROP CONSTRAINT signals_source_check;
ALTER TABLE signals ADD CONSTRAINT signals_source_check CHECK (source IN ('user_report', 'social_media', 'news', 'sensor', 'tiktok_ai', 'bmkg'));
