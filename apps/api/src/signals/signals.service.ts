import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { SignalSeverityAgent } from '../reasoning/agents/signal-severity.agent';

@Injectable()
export class SignalsService {
  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue('clustering-queue') private readonly clusteringQueue: Queue,
    private readonly severityAgent: SignalSeverityAgent,
  ) { }

  async createSignal(payload: any) {
    // 1. Analyze Severity (Fast Agent)
    let severityResult = { severity: 'low', urgency_score: 0.1 };
    try {
      const { result } = await this.severityAgent.run({
        text: payload.text || '',
        source: payload.source,
      });
      severityResult = result as any;
    } catch (e) {
      console.warn('Severity Check Failed, defaulting to low', e);
    }

    // 2. Persist Signal
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
