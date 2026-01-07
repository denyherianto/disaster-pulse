import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subMinutes } from 'date-fns';
import OpenAI from 'openai';
import { reverseGeocodeCity } from '../lib/reverseGeocoding';
import { determineStatus } from '../lib/determineStatus';

// Configuration
const CLUSTER_WINDOW_MINUTES = 60;
const MIN_SIGNALS_FOR_CLUSTER = 2;
const PROXIMITY_THRESHOLD = 0.1;

type Signal = {
  id: string;
  lat: number;
  lng: number;
  source: string;
  text: string | null;
  created_at: string;
};

type GeminiResult = {
  event_type: 'flood' | 'fire' | 'earthquake' | 'traffic' | 'protest' | 'other';
  confidence_score: number;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  reasoning: string;
};

@Injectable()
export class ClusterService {
  private readonly logger = new Logger(ClusterService.name);
  private maia: OpenAI;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.maia = new OpenAI({
      apiKey: this.configService.get<string>('MAIA_API_KEY'),
      baseURL: 'https://api.maiarouter.ai/v1',
    });
  }

  // Run manually or via Cron
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    this.logger.debug('Running clustering job...');
    const result = await this.processClusters();
    this.logger.debug('Clustering job finished', result);
    return result;
  }

  async processClusters() {
    try {
      // 1. Fetch recent signals
      const cutOffTime = subMinutes(new Date(), CLUSTER_WINDOW_MINUTES).toISOString();
      const { data: recentSignals, error: signalError } = await this.supabase.getClient()
        .from('signals')
        .select('id, lat, lng, source, text, created_at')
        .gt('created_at', cutOffTime)
        .order('created_at', { ascending: false });

      if (signalError) throw signalError;
      if (!recentSignals || recentSignals.length === 0) {
        return { message: 'No recent signals to process' };
      }

      const signalsList = recentSignals as Signal[];
      const clusters: Record<string, Signal[]> = {};

      // 2. Simple spatial clustering
      for (const sig of signalsList) {
        let found = false;
        for (const key of Object.keys(clusters)) {
          const [cLat, cLng] = key.split(',').map(Number);
          if (
            Math.abs(sig.lat - cLat) < PROXIMITY_THRESHOLD &&
            Math.abs(sig.lng - cLng) < PROXIMITY_THRESHOLD
          ) {
            clusters[key].push(sig);
            found = true;
            break;
          }
        }
        if (!found) {
          clusters[`${sig.lat},${sig.lng}`] = [sig];
        }
      }

      const results: { cluster_id: string; signal_count: number; ai_enriched: boolean }[] = [];

      // 3. Process clusters
      for (const signals of Object.values(clusters)) {
        if (signals.length < MIN_SIGNALS_FOR_CLUSTER) continue;

        const startTime = signals[signals.length - 1].created_at;
        const endTime = signals[0].created_at;
        const city = await reverseGeocodeCity(signals[0].lat, signals[0].lng);

        const { data: clusterData, error: clusterError } = await (this.supabase.getClient()
          .from('clusters') as any)
          .insert({
            city,
            time_start: startTime,
            time_end: endTime,
            status: 'monitor',
          })
          .select('id')
          .single();

        if (clusterError || !clusterData) {
          this.logger.error('Cluster creation error:', clusterError);
          continue;
        }

        // Link signals → cluster
        await (this.supabase.getClient().from('cluster_signals') as any).insert(
          signals.map((s) => ({
            cluster_id: clusterData.id,
            signal_id: s.id,
          })),
        );

        // 4. Gemini enrichment
        const aiResult: GeminiResult | null = await this.analyzeCluster(
          signals.slice(0, 5).map((s) => ({
            text: s.text,
            source: s.source,
            created_at: s.created_at,
          })),
        );

        const status = determineStatus({
          signalCount: signals.length,
          confidence: aiResult?.confidence_score ?? 0,
          severity: aiResult?.severity ?? 'low',
        });

        // 5. Create incident
        const { data: incidentData, error: incidentError } = await (this.supabase.getClient()
          .from('incidents') as any)
          .insert({
            cluster_id: clusterData.id,
            event_type: aiResult?.event_type ?? 'other',
            status,
            confidence_score: aiResult?.confidence_score ?? 0.5,
            severity: aiResult?.severity ?? 'low',
          })
          .select('id')
          .maybeSingle();

        if (incidentError) {
          this.logger.error('Incident insert error:', incidentError);
          continue;
        }

        if (incidentData) {
          // Link signals → incident
          await (this.supabase.getClient().from('incident_signals') as any).insert(
            signals.map((s) => ({
              incident_id: incidentData.id,
              signal_id: s.id,
            })),
          );

          // Optional: store AI reasoning
          if (aiResult?.reasoning) {
            await (this.supabase.getClient().from('incident_ai_explanations') as any).insert({
              incident_id: incidentData.id,
              reasoning: aiResult.reasoning,
              model: 'gemini-1.5-flash',
            });
          }
        }

        results.push({
          cluster_id: clusterData.id,
          signal_count: signals.length,
          ai_enriched: Boolean(aiResult),
        });
      }

      return { success: true, processed: results };

    } catch (error) {
      this.logger.error('Clustering Job Error:', error);
      throw error;
    }
  }

  async analyzeCluster(signals: Pick<Signal, 'text' | 'source' | 'created_at'>[]): Promise<GeminiResult | null> {
    const prompt = `
You analyze real-world incidents from multiple social signals.

Return ONLY valid JSON with:
- event_type (flood, fire, earthquake, traffic, protest, or other)
- confidence_score (0 to 1)
- severity (low | medium | high)
- summary (max 20 words)
- reasoning (brief, explainable)

Signals:
${signals.map(
  (s) => `- [${s.source}] ${s.text ?? '(no text)'} (${s.created_at})`,
).join('\n')}
`;

    try {
      const completion = await this.maia.chat.completions.create({
        model: 'maia/gemini-3-pro-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      return JSON.parse(content) as GeminiResult;
    } catch (err) {
      this.logger.error('AI Analysis Failed:', err);
      return null;
    }
  }
}
