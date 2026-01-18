-- ============================================================
-- Migration: Add Incremental + Batched Reasoning Support
-- Purpose: Enable optimized reasoning flow with incremental updates
--          and batched full evaluations
-- ============================================================

-- Add needs_full_eval flag to track which incidents need full AI evaluation
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS needs_full_eval BOOLEAN DEFAULT false;

-- Add last_evaluated_at to track when full AI evaluation was last run
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ;

-- Add cached_reasoning to store the last full AI reasoning result
-- This allows incremental comparisons without re-running AI
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS cached_reasoning JSONB;

-- Add signal_count for quick reference without joins
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS signal_count INT DEFAULT 0;

-- Create index for efficient batch evaluation queries
CREATE INDEX IF NOT EXISTS idx_incidents_needs_eval 
  ON incidents (needs_full_eval) 
  WHERE needs_full_eval = true AND status != 'resolved';

-- Create index for time-based evaluation triggers
CREATE INDEX IF NOT EXISTS idx_incidents_last_evaluated 
  ON incidents (last_evaluated_at) 
  WHERE status != 'resolved';

-- Comment for documentation
COMMENT ON COLUMN incidents.needs_full_eval IS 'Whether this incident needs full AI reasoning (set by incremental updates, cleared by batch job)';
COMMENT ON COLUMN incidents.last_evaluated_at IS 'Timestamp of the last full AI reasoning evaluation';
COMMENT ON COLUMN incidents.cached_reasoning IS 'Cached result from last full AI reasoning (multi-vector analysis, confidence breakdown, etc.)';
COMMENT ON COLUMN incidents.signal_count IS 'Number of signals linked to this incident (updated incrementally)';
