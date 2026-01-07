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

      // Check for existing signal-to-cluster mappings
      // To deduplicate efficiently, we grab all signal IDs involved
      const signalIds = signalsList.map((s) => s.id);
      const { data: existingMappings } = await (this.supabase.getClient()
        .from('cluster_signals') as any)
        .select('signal_id, cluster_id')
        .in('signal_id', signalIds);

      const signalToCluster = new Map<string, string>();
      if (existingMappings) {
        existingMappings.forEach((m: { signal_id: string; cluster_id: string }) => 
          signalToCluster.set(m.signal_id, m.cluster_id)
        );
      }

      const results: { cluster_id: string; signal_count: number; ai_enriched: boolean }[] = [];

      // 3. Process clusters
      for (const signals of Object.values(clusters)) {
        if (signals.length < MIN_SIGNALS_FOR_CLUSTER) continue;

        const startTime = signals[signals.length - 1].created_at;
        const endTime = signals[0].created_at;

        // Check if any signal in this group is already linked to a cluster
        const existingClusterId = signals
          .map((s) => signalToCluster.get(s.id))
          .find((id) => id !== undefined);

        let clusterId: string;
        let aiEnriched = false;

        if (existingClusterId) {
          clusterId = existingClusterId;
          this.logger.log(`Merging signals into existing cluster ${clusterId}`);

          // Update cluster time_end
          await (this.supabase.getClient().from('clusters') as any)
            .update({ time_end: endTime, updated_at: new Date().toISOString() })
            .eq('id', clusterId);

          // Filter signals that are NOT yet linked
          const newSignals = signals.filter((s) => !signalToCluster.has(s.id));

          if (newSignals.length > 0) {
            // Link new signals → existing cluster
            await (this.supabase.getClient().from('cluster_signals') as any).insert(
              newSignals.map((s) => ({
                cluster_id: clusterId,
                signal_id: s.id,
              })),
            );

            // Find associated incident to link signals there too
            const { data: incidentData } = await (this.supabase.getClient()
              .from('incidents') as any)
              .select('id')
              .eq('cluster_id', clusterId)
              .maybeSingle();

            if (incidentData) {
              await (this.supabase.getClient().from('incident_signals') as any).insert(
                newSignals.map((s) => ({
                  incident_id: incidentData.id,
                  signal_id: s.id,
                })),
              );
            }
          }

        } else {
          // Create NEW Cluster
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

          clusterId = clusterData.id;

          // Link signals → cluster
          await (this.supabase.getClient().from('cluster_signals') as any).insert(
            signals.map((s) => ({
              cluster_id: clusterId,
              signal_id: s.id,
            })),
          );

          // 4. Gemini enrichment (only for new clusters)
          const aiResults: GeminiResult | null = await this.analyzeCluster(
            signals.slice(0, 5).map((s) => ({
              text: s.text,
              source: s.source,
              created_at: s.created_at,
            })),
          );
          // Handle both single object and array return types
          const aiResult = Array.isArray(aiResults) ? aiResults?.[0] : aiResults;
          aiEnriched = Boolean(aiResult);

          const status = determineStatus({
            signalCount: signals.length,
            confidence: aiResult?.confidence_score ?? 0,
            severity: aiResult?.severity ?? 'low',
          });

          console.log('aiResult:', aiResult);

          // 5. Create incident
          const { data: incidentData, error: incidentError } = await (this.supabase.getClient()
            .from('incidents') as any)
            .insert({
              cluster_id: clusterId,
              event_type: aiResult?.event_type ?? 'other',
              status,
              confidence_score: aiResult?.confidence_score ?? 0.5,
              severity: aiResult?.severity ?? 'low',
            })
            .select('id')
            .maybeSingle();

          if (incidentError) {
            this.logger.error('Incident insert error:', incidentError);
            // Continue but log error
          } else if (incidentData) {
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
        }

        results.push({
          cluster_id: clusterId,
          signal_count: signals.length,
          ai_enriched: aiEnriched,
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

  // --- SMART RESOLUTION LOGIC ---

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleResolutionCron() {
    this.logger.debug('Running incident resolution job...');
    const result = await this.processIncidentResolution();
    this.logger.debug('Resolution job finished', result);
    return result;
  }

  async processIncidentResolution() {
    const { data: activeIncidents, error } = await this.supabase.getClient()
      .from('incidents')
      .select('id, severity, created_at, updated_at, clusters!inner(id)')
      .in('status', ['alert', 'monitor']);

    if (error || !activeIncidents) return;

    for (const incident of activeIncidents) {
      await this.checkIncidentResolution(incident);
    }
  }

  async checkIncidentResolution(incident: any) {
    const now = new Date();
    // Use updated_at (last modification) or fall back to created_at
    const lastActivity = new Date(incident.updated_at || incident.created_at);
    const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    // 1. Time Condition (Severity-based cool-down)
    let requiredSilenceHours = 1;
    if (incident.severity === 'medium') requiredSilenceHours = 4;
    if (incident.severity === 'high') requiredSilenceHours = 12;

    if (diffHours < requiredSilenceHours) {
      return; // Not quiet enough yet
    }

    // 2. Evidence Condition (AI Check)
    // Fetch last 10 signals for this incident's cluster
    const clusterId = incident.clusters.id;
    const { data: recentSignals } = await this.supabase.getClient()
      .from('cluster_signals')
      .select('signals(source, text, created_at)')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false } as any) // Type assertion for joined column sorting
      .limit(10);

    const signals = recentSignals?.map((rs: any) => rs.signals) || [];

    if (signals.length === 0) {
      // If no signals at all, and time passed, resolve it.
      await this.resolveIncidentInDb(incident.id, 'Silence > ' + requiredSilenceHours + 'h (No signals)');
      return;
    }

    // AI Analysis
    const prompt = `
      Analyze these recent signals for an incident (Severity: ${incident.severity}).
      Determine if the event is OVER (aftermath, cleanup, past tense) or ONGOING.
      
      Signals:
      ${signals.map((s: any) => `- [${s.source}] ${s.text} (${s.created_at})`).join('\n')}

      Return JSON:
      {
        "resolution_confidence": number (0-1, 1 means definitely resolved),
        "reason": "short explanation"
      }
    `;

    try {
      const completion = await this.maia.chat.completions.create({
        model: 'maia/gemini-3-pro-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) return;
      const result = JSON.parse(content);

      // 3. Confidence Condition
      if (result.resolution_confidence >= 0.8) {
        await this.resolveIncidentInDb(incident.id, `AI Confidence ${result.resolution_confidence}: ${result.reason}`);
      }

    } catch (err) {
      this.logger.error(`Resolution Analysis Failed for ${incident.id}:`, err);
    }
  }

  private async resolveIncidentInDb(id: string, reason: string) {
    this.logger.log(`Resolving incident ${id}: ${reason}`);
    await this.supabase.getClient()
      .from('incidents')
      .update({ status: 'resolved' })
      .eq('id', id);

    // Optional: Store resolution log/reasoning in a separate table if needed
  }
}
