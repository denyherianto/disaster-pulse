-- ============================================================
-- Disaster App Feature Migration
-- Add tables for guides, emergency_contacts, incident_feedback
-- ============================================================

-- Guides table for safety procedures
CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  disaster_type TEXT NOT NULL CHECK (
    disaster_type IN ('flood', 'earthquake', 'fire', 'landslide', 'power_outage', 'general')
  ),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('police', 'fire_department', 'ambulance', 'sar', 'bnpb', 'pln', 'pdam', 'other')
  ),
  region TEXT,
  is_national BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incident feedback (Thumbs Up/Down)
CREATE TABLE IF NOT EXISTS incident_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('confirm', 'reject')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_id, user_id)
);

CREATE INDEX IF NOT EXISTS incident_feedback_incident_idx ON incident_feedback (incident_id);

-- Seed some sample guides
INSERT INTO guides (title, description, content, disaster_type, pdf_url) VALUES
('Flood Safety Guide', 'Essential steps to stay safe during flood events', 
'## Before a Flood
- Know your area''s flood risk
- Prepare an emergency kit
- Create an evacuation plan

## During a Flood
- Move to higher ground immediately
- Avoid walking or driving through flood waters
- Stay away from power lines and electrical wires

## After a Flood
- Return home only when authorities say it is safe
- Clean and disinfect everything that got wet
- Watch for hazards like weakened walls', 
'flood', NULL),

('Earthquake Safety Guide', 'What to do before, during, and after an earthquake',
'## Before an Earthquake
- Secure heavy items to walls
- Know safe spots in each room
- Create an emergency kit

## During an Earthquake
- DROP to your hands and knees
- Take COVER under a sturdy desk or table
- HOLD ON until shaking stops

## After an Earthquake
- Check yourself and others for injuries
- Be prepared for aftershocks
- Inspect your home for damage',
'earthquake', NULL),

('Fire Emergency Guide', 'Steps to take during fire emergencies',
'## Prevention
- Install smoke detectors
- Never leave cooking unattended
- Keep flammable items away from heat sources

## During a Fire
- Alert everyone and get out immediately
- Crawl low under smoke
- Feel doors before opening

## After Escaping
- Call emergency services
- Never go back inside a burning building
- Meet at your designated meeting spot',
'fire', NULL),

('Landslide Safety Guide', 'How to prepare for and survive landslides',
'## Warning Signs
- Changes in landscape
- Unusual sounds like cracking trees
- Increased water flow in streams

## During a Landslide
- Move away from the path
- Curl into a ball if escape is impossible
- Stay alert for additional slides

## After a Landslide
- Stay away from the affected area
- Check for injured persons
- Report broken utilities',
'landslide', NULL);

-- Seed emergency contacts
INSERT INTO emergency_contacts (name, phone, category, region, is_national) VALUES
('Police Emergency', '110', 'police', NULL, true),
('Fire Department', '113', 'fire_department', NULL, true),
('Ambulance', '118', 'ambulance', NULL, true),
('BNPB (National Disaster Agency)', '117', 'bnpb', NULL, true),
('SAR (Search and Rescue)', '115', 'sar', NULL, true),
('PLN (Electricity)', '123', 'pln', NULL, true),
('PDAM (Water)', '119', 'pdam', NULL, true);
