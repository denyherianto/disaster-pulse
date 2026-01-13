-- Add news_posts table for deduplication
CREATE TABLE news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  title TEXT,
  source TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX news_posts_url_hash_idx ON news_posts (url_hash);
