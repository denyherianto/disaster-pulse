-- Add signal_id FK to source tables to link them to the generated signal

-- 1. Add signal_id to news_posts
ALTER TABLE news_posts 
ADD COLUMN signal_id UUID REFERENCES signals(id) ON DELETE SET NULL;

CREATE INDEX news_posts_signal_idx ON news_posts (signal_id);

-- 2. Add signal_id to tiktok_posts
ALTER TABLE tiktok_posts
ADD COLUMN signal_id UUID REFERENCES signals(id) ON DELETE SET NULL;

CREATE INDEX tiktok_posts_signal_idx ON tiktok_posts (signal_id);
