export async function reverseGeocodeCity(lat: number, lng: number): Promise<string> {
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

    if (!res.ok) return 'Unknown City';

    const data = await res.json();
    const addr = data.address ?? {};

    return (
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.county ||
      addr.state ||
      'Unknown City'
    );
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
    return 'Unknown City';
  }
}
