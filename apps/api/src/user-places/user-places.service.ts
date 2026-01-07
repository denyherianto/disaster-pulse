import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UserPlacesService {
  constructor(private readonly supabase: SupabaseService) {}

  async createPlace(payload: any) {
    const { data, error } = await (this.supabase.getClient()
      .from('user_places') as any)
      .insert({
        user_id: payload.user_id,
        label: payload.label,
        lat: payload.lat,
        lng: payload.lng,
        radius_m: payload.radius_m,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Create Place Error:', error);
      throw new InternalServerErrorException('Failed to create place');
    }

    return { success: true, id: data.id };
  }

  async getPlaces(userId: string) {
    const { data, error } = await this.supabase.getClient()
      .from('user_places')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('List Places Error:', error);
      throw new InternalServerErrorException('Failed to list places');
    }

    return data;
  }

  async deletePlace(id: string) {
    const { error } = await this.supabase.getClient()
      .from('user_places')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete Place Error:', error);
      throw new InternalServerErrorException('Failed to delete place');
    }

    return { success: true };
  }
}
