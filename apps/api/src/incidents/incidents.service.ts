import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class IncidentsService {
  constructor(private readonly supabase: SupabaseService) {}

  isValidBBox(minLat: number, minLng: number, maxLat: number, maxLng: number) {
    return minLat >= -90 && maxLat <= 90 && minLng >= -180 && maxLng <= 180;
  }

  async getIncidentsInViewport(minLat: number, minLng: number, maxLat: number, maxLng: number) {
    const { data: incidents, error } = await this.supabase.getClient()
      .from('incidents')
      .select(`
          id,
          status,
          severity,
          event_type,
          confidence_score,
          clusters!inner (
              id,
              city,
              cluster_signals!inner (
                  signals!inner (
                      lat,
                      lng
                  )
              )
          )
      `)
      .in('status', ['alert', 'monitor']);

    if (error) {
      console.error('Map API Error:', error);
      throw new InternalServerErrorException('Failed to fetch incidents');
    }

    // Transform and Filter
    const mapIncidents = (incidents as any[]).map(inc => {
      const sigs = inc.clusters.cluster_signals.map((cs: any) => cs.signals);
      if (sigs.length === 0) return null;

      // Calculate Centroid
      const avgLat = sigs.reduce((sum: number, s: any) => sum + s.lat, 0) / sigs.length;
      const avgLng = sigs.reduce((sum: number, s: any) => sum + s.lng, 0) / sigs.length;

      return {
        id: inc.id,
        type: inc.event_type,
        severity: inc.severity,
        confidence: inc.confidence_score,
        lat: avgLat,
        lng: avgLng,
        city: inc.clusters.city,
        status: inc.status,
      };
    }).filter(inc => inc !== null);

    // Bounds Filter
    return mapIncidents.filter(inc =>
      inc.lat >= minLat && inc.lat <= maxLat &&
      inc.lng >= minLng && inc.lng <= maxLng
    );
  }

  async getNearbyIncidents(lat: number, lng: number, radiusM: number) {
    // 1. Fetch all active incidents (reusing logic or simplified query)
    // Optimization: In a real app with PostGIS, we would use st_dwithin.
    // Here we fetch active ones and filter in memory.
    const { data: incidents, error } = await this.supabase.getClient()
      .from('incidents')
      .select(`
          id,
          status,
          severity,
          event_type,
          confidence_score,
          clusters!inner (
              city,
              cluster_signals!inner (
                  signals!inner (lat, lng)
              )
          )
      `)
      .in('status', ['alert', 'monitor']);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch incidents');
    }

    // 2. Transform to get centroids
    const candidates = (incidents as any[]).map(inc => {
      const sigs = inc.clusters.cluster_signals.map((cs: any) => cs.signals);
      if (!sigs.length) return null;

      const avgLat = sigs.reduce((sum: number, s: any) => sum + s.lat, 0) / sigs.length;
      const avgLng = sigs.reduce((sum: number, s: any) => sum + s.lng, 0) / sigs.length;

      return {
        id: inc.id,
        type: inc.event_type,
        severity: inc.severity,
        confidence: inc.confidence_score,
        city: inc.clusters.city,
        status: inc.status,
        lat: avgLat,
        lng: avgLng,
        distance: 0 // placeholder
      };
    }).filter(x => x !== null);

    // 3. Filter by Haversine Distance
    const results = candidates.map(inc => {
      inc.distance = this.getDistanceFromLatLonInM(lat, lng, inc.lat, inc.lng);
      return inc;
    }).filter(inc => inc.distance <= radiusM);

    // 4. Sort by Distance
    return results.sort((a, b) => a.distance - b.distance);
  }

  private getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  async getIncidentById(id: string) {
    const { data: incident, error } = await (this.supabase.getClient()
      .from('incidents')
      .select(`
        *,
        clusters (
            city,
            time_start,
            time_end,
            cluster_signals (
                signals (
                    *
                )
            )
        ),
        verifications (
            type,
            created_at
        )
      `)
      .eq('id', id)
      .single() as any);

    if (error || !incident) {
      throw new NotFoundException('Incident not found');
    }

    return incident;
  }
}
