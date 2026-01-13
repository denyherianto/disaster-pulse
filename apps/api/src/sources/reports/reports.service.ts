import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SignalsService } from '../../signals/signals.service';

export interface CreateReportDto {
  user_id: string;
  lat: number;
  lng: number;
  event_type: string;
  description: string;
  confidence?: 'direct_observation' | 'uncertain' | 'hearsay';
  media_url?: string;
  media_type?: 'image' | 'video';
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly signalsService: SignalsService,
  ) {}

  async createReport(dto: CreateReportDto) {
    this.logger.log(`Creating report from user ${dto.user_id}: ${dto.event_type} at (${dto.lat}, ${dto.lng})`);

    // 1. Create the signal first
    const signalResult = await this.signalsService.createSignal({
      source: 'user_report',
      text: dto.description,
      lat: dto.lat,
      lng: dto.lng,
      event_type: dto.event_type,
      media_url: dto.media_url || null,
      media_type: dto.media_type || null,
      raw_payload: {
        user_id: dto.user_id,
        confidence: dto.confidence || 'uncertain',
        original_description: dto.description,
      },
    });

    if (!signalResult?.id) {
      this.logger.error('Failed to create signal for user report');
      throw new Error('Failed to create signal');
    }

    // 2. Link to user_reports table
    const { data: report, error } = await (this.supabase.getClient() as any)
      .from('user_reports')
      .insert({
        user_id: dto.user_id,
        signal_id: signalResult.id,
        confidence: dto.confidence || 'uncertain',
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error('Failed to create user_report entry', error);
      throw new Error('Failed to create user report');
    }

    this.logger.log(`User report created: ${report.id}, linked to signal ${signalResult.id}`);

    return {
      success: true,
      report_id: report.id,
      signal_id: signalResult.id,
      severity: signalResult.severity,
    };
  }

  async getReportsByUser(userId: string) {
    const { data, error } = await (this.supabase.getClient() as any)
      .from('user_reports')
      .select(`
        id,
        confidence,
        created_at,
        signals (
          id,
          text,
          event_type,
          city_hint,
          status,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch user reports', error);
      throw error;
    }

    return data;
  }
}
