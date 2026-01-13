import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { SignalSeverityAgent } from '../reasoning/agents/signal-severity.agent';

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);
  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue('clustering-queue') private readonly clusteringQueue: Queue,
    private readonly severityAgent: SignalSeverityAgent,
  ) { }

  async createSignal(payload: any) {
    console.log('payload createSignal', payload)
    // 1. Analyze Severity (Fast Agent)
    let severityResult: any = { severity: 'low', urgency_score: 0.1, location: null, event_type: 'other' };
    try {
      const { result } = await this.severityAgent.run({
        text: payload.text || '',
        source: payload.source,
        lat: payload.lat,
        lng: payload.lng,
        city_hint: payload.city_hint,
      });
      severityResult = result;
    } catch (e) {
      console.warn('Severity Check Failed, defaulting to low', e);
    }

    if (severityResult.event_type === 'other') {
      this.logger.error(`Signal event_type is ${severityResult.event_type}. Not clustering.`);
      return;
    }

    if (severityResult.event_type === 'other') {
      this.logger.error(`Signal event_type is ${severityResult.event_type}. Not clustering.`);
      return;
    }

    if (!severityResult.event_type) {
      this.logger.error(`Signal event_type is null/undefined. Rejecting signal.`);
      return;
    }

    this.logger.log(`Ingesting signal with resolved type: ${severityResult.event_type}`);

    // 2. Persist Signal
    const { data, error } = await (this.supabase.getClient()
      .from('signals') as any)
      .insert({
        source: payload.source,
        text: payload.text || null,
        lat: severityResult.lat || payload.lat,
        lng: severityResult.lng || payload.lng,
        media_url: payload.media_url || null,
        media_type: payload.media_type || null,
        thumbnail_url: payload.thumbnail_url || null,
        city_hint: severityResult.location || payload.city_hint || null,
        event_type: severityResult.event_type,
        raw_payload: payload.raw_payload || null,
        status: 'pending',
        happened_at: payload.happened_at || undefined,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase Ingestion Error:', error);
      throw new InternalServerErrorException('Failed to ingest signal');
    }

    // 3. Publish to Queue
    const priority = severityResult.severity === 'high' ? 1 : 10;
    const delay = severityResult.severity === 'high' ? 0 : 300000; // 5m delay for low priority
    console.log('Publishing signal to queue', { priority, delay });

    await this.clusteringQueue.add(
      'cluster-signals',
      {
        signalId: data.id,
        lat: payload.lat,
        lng: payload.lng,
        severity: severityResult.severity,
      },
      {
        priority,
        delay,
        removeOnComplete: true,
      },
    );

    return { success: true, id: data.id, severity: severityResult.severity };
  }
}
