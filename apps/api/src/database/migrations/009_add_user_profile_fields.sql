-- Migration: Add user profile fields to users table
-- This adds fields to store user profile data from Supabase Auth

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'google',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email) WHERE email IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN users.email IS 'User email from auth provider';
COMMENT ON COLUMN users.name IS 'User display name from auth provider';
COMMENT ON COLUMN users.avatar_url IS 'User avatar URL from auth provider';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider (google, email, etc)';
