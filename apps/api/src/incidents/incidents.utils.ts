/**
 * Incidents Utilities
 * Shared utility functions for incident processing
 */

import { Signal, IncidentWithCentroid, IncidentFeedback } from './incidents.types';

// ============================================================
// GEOGRAPHIC CALCULATIONS
// ============================================================

/**
 * Convert degrees to radians
 */
export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in meters
 */
export function getDistanceFromLatLonInM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in metres
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate centroid (average) of coordinates
 */
export function calculateCentroid(
  points: Array<{ lat: number; lng: number }>,
): { lat: number; lng: number } {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const sumLat = points.reduce((sum, p) => sum + p.lat, 0);
  const sumLng = points.reduce((sum, p) => sum + p.lng, 0);

  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length,
  };
}

/**
 * Validate bounding box coordinates
 */
export function isValidBBox(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
): boolean {
  return (
    minLat >= -90 && maxLat <= 90 && minLng >= -180 && maxLng <= 180
  );
}

// ============================================================
// DATA TRANSFORMERS
// ============================================================

/** Raw incident from database with nested relations */
interface RawIncidentWithSignals {
  id: string;
  status: string;
  severity: string;
  event_type: string;
  confidence_score: number;
  city: string;
  summary?: string | null;
  created_at: string;
  updated_at: string;
  incident_signals: Array<{
    signals: { lat: number; lng: number };
  }>;
  incident_feedback?: IncidentFeedback[];
}

/**
 * Transform raw incident from DB to centroid-based format for map display
 * @returns null if incident has no signals
 */
export function transformIncidentWithCentroid(
  incident: RawIncidentWithSignals,
): IncidentWithCentroid | null {
  const signals = incident.incident_signals.map((is) => is.signals);

  if (signals.length === 0) {
    return null;
  }

  const centroid = calculateCentroid(signals);

  return {
    id: incident.id,
    type: incident.event_type as IncidentWithCentroid['type'],
    severity: incident.severity as IncidentWithCentroid['severity'],
    confidence: incident.confidence_score,
    lat: centroid.lat,
    lng: centroid.lng,
    city: incident.city,
    summary: incident.summary,
    status: incident.status as IncidentWithCentroid['status'],
    created_at: incident.created_at,
    updated_at: incident.updated_at,
    signal_count: signals.length,
    incident_feedback: incident.incident_feedback ?? [],
  };
}

// ============================================================
// CONFIDENCE CALCULATIONS
// ============================================================

/**
 * Calculate incremental confidence bonus using diminishing returns
 * Per EVIDENCE_WEIGHTING.md: "Independence > volume"
 *
 * @param currentConfidence Current incident confidence (0-1)
 * @param sourceWeight Weight of the new signal source
 * @returns Confidence increment to add
 */
export function calculateIncrementalConfidenceBonus(
  currentConfidence: number,
  sourceWeight: number,
): number {
  // Diminishing returns: new evidence adds less as confidence grows
  return sourceWeight * (1 - currentConfidence) * 0.3;
}

// ============================================================
// SIGNAL HELPERS
// ============================================================

/**
 * Sort signals by time (happened_at or created_at)
 */
export function sortSignalsByTime(signals: Signal[]): Signal[] {
  return [...signals].sort((a, b) => {
    const timeA = new Date(a.happened_at ?? a.created_at).getTime();
    const timeB = new Date(b.happened_at ?? b.created_at).getTime();
    return timeA - timeB;
  });
}

/**
 * Get the effective time of a signal (prefers happened_at over created_at)
 */
export function getSignalTime(signal: Signal): string {
  return signal.happened_at ?? signal.created_at;
}

/**
 * Filter signals by age (hours)
 */
export function filterFreshSignals(
  signals: Signal[],
  maxAgeHours: number,
): Signal[] {
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  return signals.filter((signal) => {
    const eventTime = new Date(getSignalTime(signal)).getTime();
    return now - eventTime <= maxAgeMs;
  });
}
