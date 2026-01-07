import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SignalsService {
  constructor(private readonly supabase: SupabaseService) {}

  async createSignal(payload: any) {
    const { data, error } = await (this.supabase.getClient()
      .from('signals') as any)
      .insert({
        source: payload.source,
        text: payload.text || null,
        lat: payload.lat,
        lng: payload.lng,
        media_url: payload.media_url || null,
        media_type: payload.media_type || null,
        city_hint: payload.city_hint || null,
        raw_payload: payload.raw_payload || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase Ingestion Error:', error);
      throw new InternalServerErrorException('Failed to ingest signal');
    }

    return { success: true, id: data.id };
  }
}
