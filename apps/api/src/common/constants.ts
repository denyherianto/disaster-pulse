export const MAX_SIGNAL_AGE: Record<string, number> = {
  earthquake: 3,      // Very time-sensitive
  accident: 6,        // Cleared relatively quickly
  power_outage: 12,   // Can last half a day
  fire: 24,           // Major fires can persist
  flood: 48,          // Floods often last days
  landslide: 48,      // After-effects linger
  other: 24,          // Default
};
