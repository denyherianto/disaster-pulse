-- Add summary column to incidents table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS summary TEXT;
