import { Controller, Get, Query, Param } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('guides')
export class GuidesController {
  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.getClient() as any;
  }

  @Get()
  async getAll(@Query('type') type?: string) {
    let query = this.db
      .from('guides')
      .select('id, title, description, disaster_type, pdf_url, created_at')
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('disaster_type', type);
    }

    const { data, error } = await query;
    return error ? [] : data;
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const { data, error } = await this.db
      .from('guides')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }
}
