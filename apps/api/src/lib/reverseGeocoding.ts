/**
 * Reverse geocode using Google Maps API to get formatted_address
 * Returns the full formatted address string for better location context
 */
export async function reverseGeocodeCity(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY is missing, falling back to Nominatim');
    return reverseGeocodeCityNominatim(lat, lng);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn('Google Maps reverse geocoding failed, falling back to Nominatim');
      return reverseGeocodeCityNominatim(lat, lng);
    }

    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn(`Google Maps geocoding status: ${data.status}, falling back to Nominatim`);
      return reverseGeocodeCityNominatim(lat, lng);
    }

    // Return the formatted_address from the first result
    return data.results[0].formatted_address ?? null;
  } catch (err) {
    console.error('Google Maps reverse geocoding failed:', err);
    return reverseGeocodeCityNominatim(lat, lng);
  }
}

/**
 * Fallback reverse geocoding using Nominatim (OpenStreetMap)
 */
async function reverseGeocodeCityNominatim(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          // REQUIRED by Nominatim usage policy
          'User-Agent': 'disaster-pulse/1.0 (contact@yourdomain.com)'
        }
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    // Return display_name as the formatted address for consistency
    return data.display_name ?? null;
  } catch (err) {
    console.error('Nominatim reverse geocoding failed:', err);
    return null;
  }
}
