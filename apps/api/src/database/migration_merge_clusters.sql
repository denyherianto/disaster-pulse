-- ============================================================
-- Migration: Merge Clusters into Incidents
-- ============================================================
-- 
-- This migration absorbs the `clusters` table into `incidents`.
-- Run this AFTER backing up your database.
--
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 0: Drop dependent views FIRST
-- ============================================================

DROP VIEW IF EXISTS cluster_active_incidents;

-- ============================================================
-- STEP 1: Add new columns to incidents (nullable first for migration)
-- ============================================================

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS time_start TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS time_end TIMESTAMPTZ;

-- ============================================================
-- STEP 2: Migrate data from clusters to incidents
-- ============================================================

UPDATE incidents i
SET 
  city = c.city,
  time_start = c.time_start,
  time_end = c.time_end
FROM clusters c
WHERE i.cluster_id = c.id;

-- ============================================================
-- STEP 3: Migrate cluster_signals to incident_signals
-- ============================================================

-- Insert missing signal links (signals linked to cluster but not yet to incident)
INSERT INTO incident_signals (incident_id, signal_id)
SELECT DISTINCT i.id, cs.signal_id
FROM incidents i
JOIN cluster_signals cs ON cs.cluster_id = i.cluster_id
WHERE NOT EXISTS (
  SELECT 1 FROM incident_signals iss 
  WHERE iss.incident_id = i.id AND iss.signal_id = cs.signal_id
);

-- ============================================================
-- STEP 4: Set defaults for any incidents without cluster data
-- ============================================================

UPDATE incidents
SET 
  city = COALESCE(city, 'Unknown'),
  time_start = COALESCE(time_start, created_at),
  time_end = COALESCE(time_end, created_at)
WHERE city IS NULL OR time_start IS NULL OR time_end IS NULL;

-- ============================================================
-- STEP 5: Make new columns NOT NULL
-- ============================================================

ALTER TABLE incidents ALTER COLUMN city SET NOT NULL;
ALTER TABLE incidents ALTER COLUMN time_start SET NOT NULL;
ALTER TABLE incidents ALTER COLUMN time_end SET NOT NULL;

-- ============================================================
-- STEP 6: Add new indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS incidents_city_event_type_idx ON incidents (city, event_type);
CREATE INDEX IF NOT EXISTS incidents_time_idx ON incidents (time_start DESC, time_end DESC);

-- ============================================================
-- STEP 7: Update incident_relationships (remove cluster_id)
-- ============================================================

ALTER TABLE incident_relationships DROP COLUMN IF EXISTS cluster_id;

-- ============================================================
-- STEP 8: Update ai_evaluations (change constraint, keep incident_id only)
-- ============================================================

-- Remove old constraint
ALTER TABLE ai_evaluations DROP CONSTRAINT IF EXISTS ai_evaluations_check;

-- Update any evaluations linked to clusters to link to incidents instead
UPDATE ai_evaluations ae
SET incident_id = (
  SELECT i.id FROM incidents i WHERE i.cluster_id = ae.cluster_id LIMIT 1
)
WHERE ae.cluster_id IS NOT NULL AND ae.incident_id IS NULL;

-- Drop cluster_id column
ALTER TABLE ai_evaluations DROP COLUMN IF EXISTS cluster_id;

-- Add new constraint (incident_id required)
ALTER TABLE ai_evaluations ALTER COLUMN incident_id SET NOT NULL;

-- ============================================================
-- STEP 9: Update agent_traces (remove cluster_id)
-- ============================================================

-- Migrate cluster_id to incident_id where possible
UPDATE agent_traces at
SET incident_id = (
  SELECT i.id FROM incidents i WHERE i.cluster_id = at.cluster_id LIMIT 1
)
WHERE at.cluster_id IS NOT NULL AND at.incident_id IS NULL;

ALTER TABLE agent_traces DROP COLUMN IF EXISTS cluster_id;

-- ============================================================
-- STEP 10: Drop incidents.cluster_id column
-- ============================================================

DROP INDEX IF EXISTS incidents_cluster_idx;
ALTER TABLE incidents DROP COLUMN IF EXISTS cluster_id;

-- ============================================================
-- STEP 11: Drop deprecated tables and views
-- ============================================================

DROP VIEW IF EXISTS cluster_active_incidents;
DROP TABLE IF EXISTS cluster_lifecycle;
DROP TABLE IF EXISTS cluster_metrics;
DROP TABLE IF EXISTS cluster_signals;
DROP TABLE IF EXISTS clusters;

COMMIT;

-- ============================================================
-- Verification Queries (run after migration)
-- ============================================================
-- 
-- Check incident count:
-- SELECT COUNT(*) FROM incidents;
--
-- Check signal linkage:
-- SELECT COUNT(*) FROM incident_signals;
--
-- Verify no orphaned data:
-- SELECT * FROM incidents WHERE city IS NULL;
