import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import OpenAI from 'openai';
import { reverseGeocodeCity } from '../lib/reverseGeocoding';
import { determineStatus } from '../lib/determineStatus';
import { ReasoningService } from '../reasoning/reasoning.service';

// Configuration
const MIN_SIGNALS_FOR_CLUSTER = 2; // Need at least 2 to form a cluster
// Proximity not used for lookup anymore, but could be used for extra validation if needed

type Signal = {
  id: string;
  source: string;
  text: string | null;
  lat: number;
  lng: number;
  city_hint?: string;
  created_at: string;
  happened_at?: string;
  status?: string;
};

@Injectable()
export class ClusterService {
  private readonly logger = new Logger(ClusterService.name);
  private maia: OpenAI;

  // Maximum validity per disaster type (in hours)
  private readonly MAX_SIGNAL_AGE: Record<string, number> = {
    earthquake: 3,      // Very time-sensitive
    accident: 6,        // Cleared relatively quickly
    power_outage: 12,   // Can last half a day
    fire: 24,           // Major fires can persist
    flood: 48,          // Floods often last days
    landslide: 48,      // After-effects linger
    other: 24,          // Default
  };

  private get db() {
    return this.supabase.getClient() as any;
  }

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly reasoningService: ReasoningService,
  ) {
    this.maia = new OpenAI({
      apiKey: this.configService.get<string>('MAIA_API_KEY'),
      baseURL: 'https://api.maiarouter.ai/v1',
    });
  }

  // --- HELPERS ---

  async classifySignalText(text: string | null): Promise<string> {
    if (!text) return 'other';

    try {
      const response = await this.maia.chat.completions.create({
        model: 'maia/gemini-2.5-flash', // Fast model
        messages: [
          {
            role: 'system',
            content: 'Classify the disaster text into one of: flood, earthquake, fire, landslide, power_outage, accident, other. Return ONLY the label.'
          },
          { role: 'user', content: text }
        ],
        temperature: 0,
      });

      const label = response.choices[0].message.content?.trim().toLowerCase() || 'other';
      // Validate
      const valid = ['flood', 'earthquake', 'fire', 'landslide', 'power_outage', 'accident', 'other'];
      return valid.includes(label) ? label : 'other';
    } catch (e) {
      this.logger.error('Classification failed', e);
      return 'other';
    }
  }

  // --- EVENT-DRIVEN PROCESSING ---

  /**
   * Main entry point for processing a single new signal.
   * Invoked by ClusterProcessor.
   */
  async processSignal(signalId: string, lat: number, lng: number) {
    this.logger.debug(`Processing signal ${signalId} at ${lat}, ${lng}`);

    try {
      // 1. Fetch full signal details
      const { data: signal, error: fetchError } = await this.db
        .from('signals')
        .select('*')
        .eq('id', signalId)
        .single();

      if (fetchError || !signal) {
        this.logger.error(`Signal ${signalId} not found or error fetching:`, fetchError);
        return;
      }

      if (signal.status === 'processed') {
        this.logger.debug(`Signal ${signalId} already processed. Skipping.`);
        return;
      }

      // OPTIMIZATION: Check if already clustered (e.g. by a previous pooled job)
      const { data: existingLink } = await this.db
        .from('cluster_signals')
        .select('cluster_id')
        .eq('signal_id', signalId)
        .maybeSingle();

      if (existingLink) {
        this.logger.debug(`Signal ${signalId} already clustered in ${existingLink.cluster_id}. Skipping.`);
        // Mark as processed since it is clustered
        await this.markSignalStatus(signalId, 'processed');
        return;
      }

      // 2. Reverse Geocode to get City
      const city = await reverseGeocodeCity(lat, lng);
      if (!city) {
        this.logger.warn(`Could not determine city for signal ${signalId}. Skipping clustering.`);
        await this.markSignalStatus(signalId, 'failed');
        return;
      }

      // Update signal with city_hint
      await this.db
        .from('signals')
        .update({ city_hint: city })
        .eq('id', signalId);

      signal.city_hint = city; // localized update

      // 3. Classify Signal
      const eventType = await this.classifySignalText(signal.text || signal.source);

      // 4. Find Active Cluster in this City AND Event Type
      const activeCluster = await this.findActiveClusterInCity(city, eventType);

      if (activeCluster) {
        await this.mergeSignalToCluster(signal, activeCluster);
      } else {
        await this.tryCreateNewCluster(signal, city, eventType);
      }

      // Mark as successfully processed
      await this.markSignalStatus(signalId, 'processed');

    } catch (error) {
      this.logger.error(`Error processing signal ${signalId}:`, error);
      await this.markSignalStatus(signalId, 'failed').catch(e => this.logger.error('Failed to mark signal as failed', e));
      throw error;
    }
  }

  private async markSignalStatus(signalId: string, status: 'processed' | 'failed') {
    await this.db.from('signals').update({ status }).eq('id', signalId);
  }

  private async findActiveClusterInCity(city: string, eventType: string) {
    // Check for monitor or alert clusters in the city with same event type
    const query = this.db
      .from('clusters')
      .select('id, city, status, time_start, time_end, event_type_guess')
      .eq('city', city)
      .neq('status', 'resolved');

    // Only filter by event_type if it's specific.
    // Use loose matching: if cluster is 'unknown' or null, maybe we can merge?
    // For now, STRICT matching:
    if (eventType !== 'other') {
      query.eq('event_type_guess', eventType);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      this.logger.error(`Error finding active cluster in ${city}:`, error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  }

  private async mergeSignalToCluster(signal: Signal, cluster: any) {
    this.logger.log(`Merging signal ${signal.id} into existing cluster ${cluster.id} (${cluster.city})`);

    const clusterId = cluster.id;

    // 1. Link Signal to Cluster
    const { error: linkError } = await this.db
      .from('cluster_signals')
      .upsert({ cluster_id: clusterId, signal_id: signal.id }, { onConflict: 'cluster_id, signal_id', ignoreDuplicates: true });

    if (linkError) {
      this.logger.error(`Failed to link signal ${signal.id} to cluster ${clusterId}:`, linkError);
      return;
    }

    // 2. Update Cluster Metadata (time_end, updated_at)
    // Use happened_at for event timeline, falling back to created_at
    const signalTime = signal.happened_at || signal.created_at;

    await this.db
      .from('clusters')
      .update({
        time_end: signalTime > cluster.time_end ? signalTime : cluster.time_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clusterId);


    // 3. Link to Incident (if exists)
    const { data: incident } = await this.db
      .from('incidents')
      .select('id, severity, confidence_score, status, event_type')
      .eq('cluster_id', clusterId)
      .maybeSingle();

    if (incident) {
      await this.db
        .from('incident_signals')
        .upsert({ incident_id: incident.id, signal_id: signal.id }, { onConflict: 'incident_id, signal_id', ignoreDuplicates: true });
    }

    // 4. Re-Evaluate & Escalate
    await this.evaluateClusterState(clusterId, incident);
  }

  private async tryCreateNewCluster(signal: Signal, city: string, eventType: string) {
    // 1. Check for unclustered signals in the same city
    // Fetch potential neighbors (including self)
    const { data: candidates, error } = await this.db
      .from('signals')
      .select('id, city_hint, created_at, happened_at, source, text, lat, lng')
      .eq('city_hint', city)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !candidates) return;

    // Filter out those already clustered
    const candidateIds = candidates.map(c => c.id);
    const { data: alreadyClustered } = await this.db
      .from('cluster_signals')
      .select('signal_id')
      .in('signal_id', candidateIds);

    const clusteredSet = new Set(alreadyClustered?.map(ac => ac.signal_id) || []);
    const unclusteredSignals = candidates.filter(c => !clusteredSet.has(c.id));

    // Ensure current signal is in the list
    if (!unclusteredSignals.find(s => s.id === signal.id)) {
      unclusteredSignals.push(signal as any);
    }

    if (unclusteredSignals.length < MIN_SIGNALS_FOR_CLUSTER) {
      this.logger.debug(`Signal ${signal.id} is pending (City: ${city}, Event: ${eventType}, Unclustered neighbors: ${unclusteredSignals.length - 1})`);
      return; // Wait for more signals
    }

    // TODO: Ideally we should verify if 'unclusteredSignals' also match the eventType?
    // For now, we assume temporal proximity in the same city implies relation, 
    // and the cluster takes the type of the TRIGGERING signal.

    // CREATE CLUSTER
    this.logger.log(`Creating NEW Cluster in ${city} for ${eventType} with ${unclusteredSignals.length} signals`);

    // Sort by time (happened_at > created_at)
    unclusteredSignals.sort((a, b) => {
      const timeA = new Date(a.happened_at || a.created_at).getTime();
      const timeB = new Date(b.happened_at || b.created_at).getTime();
      return timeA - timeB;
    });

    const timeStart = unclusteredSignals[0].happened_at || unclusteredSignals[0].created_at;
    const timeEnd = unclusteredSignals[unclusteredSignals.length - 1].happened_at || unclusteredSignals[unclusteredSignals.length - 1].created_at;

    const { data: newCluster, error: createError } = await this.db
      .from('clusters')
      .insert({
        city,
        event_type_guess: eventType, // Set the guess!
        time_start: timeStart,
        time_end: timeEnd,
        status: 'monitor',
      })
      .select('id')
      .single();

    if (createError || !newCluster) {
      this.logger.error('Failed to create cluster:', createError);
      return;
    }

    // Link signals
    const links = unclusteredSignals.map(s => ({
      cluster_id: newCluster.id,
      signal_id: s.id
    }));

    await this.db.from('cluster_signals').insert(links);

    // Initial Evaluation
    await this.evaluateClusterState(newCluster.id, null);
  }


  /**
   * Core Logic: Runs Reasoning Service to analyze cluster and escalate/update incidents.
   */
  private async evaluateClusterState(clusterId: string, currentIncident: any | null) {
    this.logger.log(`Evaluating state for Cluster ${clusterId}...`);
    console.log("clusterId", clusterId);

    // 0. Resolve Event Type for Freshness Check
    let eventType = 'other';
    if (currentIncident?.event_type) {
      eventType = currentIncident.event_type;
    } else {
      const { data: cluster } = await this.db
        .from('clusters')
        .select('event_type_guess')
        .eq('id', clusterId)
        .single();
      if (cluster?.event_type_guess) eventType = cluster.event_type_guess;
    }

    // 1. Fetch Context (Signals)
    const { data: signalsData, error: signalsError } = await this.db
      .from('cluster_signals')
      .select('signals(source, text, created_at, happened_at)')
      .eq('cluster_id', clusterId)
      .order('signals(created_at)', { ascending: false } as any)
      .limit(50);

    console.log("signalsData", signalsData);
    console.log("signalsError", signalsError);

    let signalsContext = signalsData?.map((s: any) => s.signals) || [];
    console.log("signalsContext", signalsContext);

    // FILTER: Filter out expired signals based on eventType
    const maxAgeHours = this.MAX_SIGNAL_AGE[eventType] || this.MAX_SIGNAL_AGE['other'];
    const now = Date.now();

    signalsContext = signalsContext.filter((s: any) => {
      const eventTime = s.happened_at ? new Date(s.happened_at).getTime() : new Date(s.created_at).getTime();
      const ageHours = (now - eventTime) / (1000 * 60 * 60);
      return ageHours <= maxAgeHours;
    });

    if (signalsContext.length === 0) {
      this.logger.debug(`No fresh signals for ${eventType} in cluster ${clusterId}. Skipping reasoning.`);
      return;
    }

    // 2. Fetch Context (Existing Incidents nearby? - Optional, for now just pass currentIncident)
    const incidentContext = currentIncident ? [currentIncident] : [];

    // 3. Run AI Reasoning
    const reasoningResult = await this.reasoningService.runReasoningLoop(
      signalsContext,
      incidentContext as any, // Expects id/type/city mainly
      clusterId
    );

    const { conclusion, decision } = reasoningResult;

    // 4. Action Logic

    // Scenario A: Existing Incident -> Check for Update
    if (currentIncident) {
      const newSeverity = conclusion.severity;
      const newConfidence = conclusion.confidence_score;

      // Update if:
      // - Severity changed (e.g. low -> high)
      // - Confidence changed significantly (> 0.1)
      // - Status needs update (handled by decision.action logic usually, but we check props here)

      const severityChanged = newSeverity !== currentIncident.severity;
      const confidenceChanged = Math.abs(newConfidence - currentIncident.confidence_score) > 0.1;

      if (severityChanged || confidenceChanged) {
        this.logger.log(`Updating Incident ${currentIncident.id}: Sev ${currentIncident.severity}->${newSeverity}, Conf ${currentIncident.confidence_score}->${newConfidence}`);

        await this.db
          .from('incidents')
          .update({
            severity: newSeverity,
            confidence_score: newConfidence,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentIncident.id);
      }
      return;
    }

    // Scenario B: No Incident -> Check for Creation (Escalation)
    // We create an incident if:
    // - Action is explicitly CREATE/MERGE
    // - OR Severity is HIGH (Auto-escalate)

    const shouldCreate =
      decision.action === 'CREATE_INCIDENT' ||
      decision.action === 'MERGE_INCIDENT' ||
      conclusion.severity === 'high';

    if (shouldCreate) {
      this.logger.log(`Escalating Cluster ${clusterId} to Incident (Sev: ${conclusion.severity}).`);

      const status = determineStatus({
        signalCount: signalsContext.length,
        confidence: conclusion.confidence_score,
        severity: conclusion.severity
      });

      // Create Incident
      const { data: newIncident, error: incidentError } = await this.db
        .from('incidents')
        .insert({
          cluster_id: clusterId,
          event_type: conclusion.final_classification,
          status, // monitor or alert
          confidence_score: conclusion.confidence_score,
          severity: conclusion.severity,
        })
        .select('id')
        .single();

      console.log("newIncident", newIncident);
      console.log("incidentError", incidentError);

      if (newIncident) {
        // Link ALL signals in cluster to this new incident
        const { data: allClusterSignals } = await this.db
          .from('cluster_signals')
          .select('signal_id')
          .eq('cluster_id', clusterId);

        if (allClusterSignals) {
          const incidentLinks = allClusterSignals.map((s: any) => ({
            incident_id: newIncident.id,
            signal_id: s.signal_id
          }));
          await this.db.from('incident_signals').insert(incidentLinks);
        }
      }
    }
  }

  // --- EXISTING RESOLUTION CRON (Kept as is) ---
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleResolutionCron() {
    this.logger.debug('Running incident resolution job...');
    const result = await this.processIncidentResolution();
    this.logger.debug('Resolution job finished', result);
    return result;
  }

  async processIncidentResolution() {
    const { data: activeIncidents, error } = await this.db
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
    const lastActivity = new Date(incident.updated_at || incident.created_at);
    const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    let requiredSilenceHours = 1;
    if (incident.severity === 'medium') requiredSilenceHours = 4;
    if (incident.severity === 'high') requiredSilenceHours = 12;

    if (diffHours < requiredSilenceHours) {
      return;
    }

    const clusterId = incident.clusters.id;
    const { data: recentSignals } = await this.db
      .from('cluster_signals')
      .select('signals(source, text, created_at)')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false } as any)
      .limit(10);

    const signals = recentSignals?.map((rs: any) => rs.signals) || [];

    if (signals.length === 0) {
      await this.resolveIncidentInDb(incident.id, 'Silence > ' + requiredSilenceHours + 'h (No signals)');
      return;
    }

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

      if (result.resolution_confidence >= 0.8) {
        await this.resolveIncidentInDb(incident.id, `AI Confidence ${result.resolution_confidence}: ${result.reason}`);
      }

    } catch (err) {
      this.logger.error(`Resolution Analysis Failed for ${incident.id}:`, err);
    }
  }

  private async resolveIncidentInDb(id: string, reason: string) {
    this.logger.log(`Resolving incident ${id}: ${reason}`);
    await (this.db
      .from('incidents') as any)
      .update({ status: 'resolved' })
      .eq('id', id);
  }
}

