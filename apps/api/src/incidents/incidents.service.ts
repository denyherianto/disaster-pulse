import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { reverseGeocodeCity } from '../lib/reverseGeocoding';
import { determineStatus } from '../lib/determineStatus';
import { ReasoningService } from '../reasoning/reasoning.service';
import { IncidentResolutionAgent } from '../reasoning/agents/incident-resolution.agent';
import { MAX_SIGNAL_AGE } from '../common/constants';

// Configuration
const MIN_SIGNALS_FOR_INCIDENT = 2; // Need at least 2 signals to create an incident

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
  event_type?: string;
};

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  private get db() {
    return this.supabase.getClient() as any;
  }

  constructor(
    private readonly supabase: SupabaseService,
    private readonly reasoningService: ReasoningService,
    private readonly resolutionAgent: IncidentResolutionAgent,
  ) { }

  // ============================================================
  // SIGNAL PROCESSING (formerly in ClusterService)
  // ============================================================

  /**
   * Main entry point for processing a single new signal.
   * Invoked by IncidentProcessor.
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

      // Check if already linked to an incident
      const { data: existingLink } = await this.db
        .from('incident_signals')
        .select('incident_id')
        .eq('signal_id', signalId)
        .maybeSingle();

      if (existingLink) {
        this.logger.debug(`Signal ${signalId} already linked to incident ${existingLink.incident_id}. Skipping.`);
        await this.markSignalStatus(signalId, 'processed');
        return;
      }

      // 2. Reverse Geocode to get City
      const city = await reverseGeocodeCity(lat, lng);
      if (city) {
        await this.db
          .from('signals')
          .update({ city_hint: city })
          .eq('id', signalId);

        signal.city_hint = city;
      }

      // 3. Find Active Incident in this City AND Event Type
      const activeIncident = await this.findActiveIncident(signal.city_hint, signal.event_type);

      if (activeIncident) {
        await this.mergeSignalToIncident(signal, activeIncident);
      } else {
        await this.tryCreateNewIncident(signal, signal.city_hint, signal.event_type);
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

  private async findActiveIncident(city: string, eventType: string) {
    const query = this.db
      .from('incidents')
      .select('id, city, status, time_start, time_end, event_type, severity, confidence_score')
      .eq('city', city)
      .neq('status', 'resolved');

    // Only filter by event_type if it's specific
    if (eventType !== 'other') {
      query.eq('event_type', eventType);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      this.logger.error(`Error finding active incident in ${city}:`, error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  }

  private async mergeSignalToIncident(signal: Signal, incident: any) {
    this.logger.log(`Merging signal ${signal.id} into existing incident ${incident.id} (${incident.city})`);

    const incidentId = incident.id;

    // 1. Link Signal to Incident
    const { error: linkError } = await this.db
      .from('incident_signals')
      .upsert(
        { incident_id: incidentId, signal_id: signal.id },
        { onConflict: 'incident_id, signal_id', ignoreDuplicates: true }
      );

    if (linkError) {
      this.logger.error(`Failed to link signal ${signal.id} to incident ${incidentId}:`, linkError);
      return;
    }

    // 2. Update Incident time_end if signal is newer
    const signalTime = signal.happened_at || signal.created_at;

    await this.db
      .from('incidents')
      .update({
        time_end: signalTime > incident.time_end ? signalTime : incident.time_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    // 3. Re-Evaluate incident state
    await this.evaluateIncidentState(incidentId, incident);
  }

  private async tryCreateNewIncident(signal: Signal, city: string, eventType: string) {
    // 1. Check for unclustered signals in the same city
    const { data: candidates, error } = await this.db
      .from('signals')
      .select('id, city_hint, created_at, happened_at, source, text, lat, lng')
      .eq('city_hint', city)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !candidates) return;

    // Filter out those already linked to incidents
    const candidateIds = candidates.map((c: any) => c.id);
    const { data: alreadyLinked } = await this.db
      .from('incident_signals')
      .select('signal_id')
      .in('signal_id', candidateIds);

    const linkedSet = new Set(alreadyLinked?.map((al: any) => al.signal_id) || []);
    const unlinkedSignals = candidates.filter((c: any) => !linkedSet.has(c.id));

    // Ensure current signal is in the list
    if (!unlinkedSignals.find((s: any) => s.id === signal.id)) {
      unlinkedSignals.push(signal as any);
    }

    if (unlinkedSignals.length < MIN_SIGNALS_FOR_INCIDENT) {
      this.logger.debug(`Signal ${signal.id} is pending (City: ${city}, Event: ${eventType}, Unlinked neighbors: ${unlinkedSignals.length - 1})`);
      return; // Wait for more signals
    }

    // CREATE INCIDENT
    this.logger.log(`Creating NEW Incident in ${city} for ${eventType} with ${unlinkedSignals.length} signals`);

    // Sort by time
    unlinkedSignals.sort((a: any, b: any) => {
      const timeA = new Date(a.happened_at || a.created_at).getTime();
      const timeB = new Date(b.happened_at || b.created_at).getTime();
      return timeA - timeB;
    });

    const timeStart = unlinkedSignals[0].happened_at || unlinkedSignals[0].created_at;
    const timeEnd = unlinkedSignals[unlinkedSignals.length - 1].happened_at || unlinkedSignals[unlinkedSignals.length - 1].created_at;

    const { data: newIncident, error: createError } = await this.db
      .from('incidents')
      .insert({
        city,
        event_type: eventType,
        time_start: timeStart,
        time_end: timeEnd,
        status: 'monitor',
      })
      .select('id')
      .single();

    if (createError || !newIncident) {
      this.logger.error('Failed to create incident:', createError);
      return;
    }

    // Link signals
    const links = unlinkedSignals.map((s: any) => ({
      incident_id: newIncident.id,
      signal_id: s.id
    }));

    await this.db.from('incident_signals').insert(links);

    // Log initial creation
    await this.logLifecycleEvent(newIncident.id, null, 'monitor', 'system', `Initial creation from ${unlinkedSignals.length} signals`);

    // Initial Evaluation
    await this.evaluateIncidentState(newIncident.id, null);
  }

  /**
   * Core Logic: Runs Reasoning Service to analyze incident and update state.
   */
  private async evaluateIncidentState(incidentId: string, currentIncident: any | null) {
    this.logger.log(`Evaluating state for Incident ${incidentId}...`);

    // 0. Resolve Event Type for Freshness Check
    let eventType = 'other';
    if (currentIncident?.event_type) {
      eventType = currentIncident.event_type;
    } else {
      const { data: incident } = await this.db
        .from('incidents')
        .select('event_type')
        .eq('id', incidentId)
        .single();
      if (incident?.event_type) eventType = incident.event_type;
    }

    // 1. Fetch Context (Signals)
    const { data: signalsData, error: signalsError } = await this.db
      .from('incident_signals')
      .select('signals(source, text, created_at, happened_at)')
      .eq('incident_id', incidentId)
      .order('signals(created_at)', { ascending: false } as any)
      .limit(50);

    if (signalsError) {
      this.logger.error('Error fetching signals:', signalsError);
      return;
    }

    let signalsContext = signalsData?.map((s: any) => s.signals) || [];

    // Filter out expired signals based on eventType
    const maxAgeHours = MAX_SIGNAL_AGE[eventType] || MAX_SIGNAL_AGE['other'];
    const now = Date.now();

    signalsContext = signalsContext.filter((s: any) => {
      const eventTime = s.happened_at ? new Date(s.happened_at).getTime() : new Date(s.created_at).getTime();
      const ageHours = (now - eventTime) / (1000 * 60 * 60);
      return ageHours <= maxAgeHours;
    });

    if (signalsContext.length === 0) {
      this.logger.debug(`No fresh signals for ${eventType} in incident ${incidentId}. Skipping reasoning.`);
      return;
    }

    // 2. Fetch Context (Existing Incidents nearby)
    const incidentContext = currentIncident ? [currentIncident] : [];

    // 3. Run AI Reasoning
    const reasoningResult = await this.reasoningService.runReasoningLoop(
      signalsContext,
      incidentContext as any,
      incidentId
    );

    const { conclusion, decision } = reasoningResult;

    // 4. Action Logic

    // Scenario A: Existing Incident -> Check for Update
    if (currentIncident) {
      const newSeverity = conclusion.severity;
      const newConfidence = conclusion.confidence_score;
      const newEventType = conclusion.final_classification;

      const severityChanged = newSeverity !== currentIncident.severity;
      const confidenceChanged = Math.abs(newConfidence - currentIncident.confidence_score) > 0.1;

      // Check if event type changed and is valid
      const validTypes = ['flood', 'landslide', 'fire', 'earthquake', 'power_outage', 'other'];
      let eventTypeChanged = false;
      let targetEventType = currentIncident.event_type;

      if (validTypes.includes(newEventType) && newEventType !== currentIncident.event_type) {
        // If current is 'other', always upgrade. If current is specific and new is specific but different, switch (AI changed mind).
        if (currentIncident.event_type === 'other' || newEventType !== 'other') {
          eventTypeChanged = true;
          targetEventType = newEventType;
        }
      }

      if (severityChanged || confidenceChanged || eventTypeChanged) {
        this.logger.log(`Updating Incident ${currentIncident.id}: Type ${currentIncident.event_type}->${targetEventType}, Sev ${currentIncident.severity}->${newSeverity}`);

        const { error } = await this.db
          .from('incidents')
          .update({
            event_type: targetEventType,
            severity: newSeverity,
            confidence_score: newConfidence,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentIncident.id);

        if (error) this.logger.error(`Failed to update incident ${currentIncident.id}`, error);
      }
      return;
    }

    // Scenario B: New Incident -> Set initial properties
    // Scenario B: New Incident -> Set initial properties
    const shouldAlert =
      decision.action === 'CREATE_INCIDENT' ||
      decision.action === 'MERGE_INCIDENT' ||
      conclusion.severity === 'high';

    const status = shouldAlert
      ? determineStatus({
        signalCount: signalsContext.length,
        confidence: conclusion.confidence_score,
        severity: conclusion.severity
      })
      : 'monitor';

    // Check if status changed from initial "monitor"
    if (status !== 'monitor') {
      await this.logLifecycleEvent(incidentId, 'monitor', status, 'ai', `AI Decision: ${decision.action}`);
    }

    // Always update the incident with the reasoning result (confidence, severity, type)
    // regardless of whether we alert or not. 
    await this.db
      .from('incidents')
      .update({
        status,
        confidence_score: conclusion.confidence_score,
        severity: conclusion.severity,
        event_type: conclusion.final_classification || eventType,
        updated_at: new Date().toISOString()
      })
      .eq('id', incidentId);
  }

  // ============================================================
  // RESOLUTION CRON (formerly in ClusterService)
  // ============================================================

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
      .select('id, severity, created_at, updated_at')
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

    const { data: recentSignals } = await this.db
      .from('incident_signals')
      .select('signals(source, text, created_at)')
      .eq('incident_id', incident.id)
      .order('created_at', { ascending: false } as any)
      .limit(10);

    const signals = recentSignals?.map((rs: any) => rs.signals) || [];

    if (signals.length === 0) {
      await this.resolveIncidentInDb(incident.id, 'Silence > ' + requiredSilenceHours + 'h (No signals)');
      return;
    }

    try {
      const { result } = await this.resolutionAgent.run({
        incidentSeverity: incident.severity,
        signals: signals,
      });

      if (result.resolution_confidence >= 0.8) {
        await this.resolveIncidentInDb(incident.id, `AI Confidence ${result.resolution_confidence}: ${result.reason}`);
      }
    } catch (err) {
      this.logger.error(`Resolution Analysis Failed for ${incident.id}:`, err);
    }
  }

  private async resolveIncidentInDb(id: string, reason: string) {
    this.logger.log(`Resolving incident ${id}: ${reason}`);

    await this.logLifecycleEvent(id, 'active', 'resolved', 'ai', reason);

    await this.db
      .from('incidents')
      .update({ status: 'resolved' })
      .eq('id', id);
  }

  // ============================================================
  // QUERY METHODS (simplified - no more cluster joins)
  // ============================================================

  isValidBBox(minLat: number, minLng: number, maxLat: number, maxLng: number) {
    return minLat >= -90 && maxLat <= 90 && minLng >= -180 && maxLng <= 180;
  }

  async getIncidentsInViewport(minLat: number, minLng: number, maxLat: number, maxLng: number) {
    const { data: incidents, error } = await this.db
      .from('incidents')
      .select(`
        id,
        status,
        severity,
        event_type,
        confidence_score,
        city,
        incident_signals!inner (
          signals!inner (
            lat,
            lng
          )
        ),
        incident_feedback (
            user_id,
            type
        )
      `)
      .in('status', ['alert', 'monitor']);

    if (error) {
      console.error('Map API Error:', error);
      throw new InternalServerErrorException('Failed to fetch incidents');
    }

    // Transform and Filter
    const mapIncidents = (incidents as any[]).map(inc => {
      const sigs = inc.incident_signals.map((is: any) => is.signals);
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
        city: inc.city,
        status: inc.status,
        signal_count: sigs.length,
        user_feedback: inc.incident_feedback || []
      };
    }).filter(inc => inc !== null);

    // Bounds Filter
    return mapIncidents.filter(inc =>
      inc.lat >= minLat && inc.lat <= maxLat &&
      inc.lng >= minLng && inc.lng <= maxLng
    );
  }

  async getNearbyIncidents(lat: number, lng: number, radiusM: number) {
    const { data: incidents, error } = await this.db
      .from('incidents')
      .select(`
        id,
        status,
        severity,
        event_type,
        confidence_score,
        city,
        incident_signals!inner (
          signals!inner (lat, lng)
        ),
        incident_feedback (
            user_id,
            type
        )
      `)
      .in('status', ['alert', 'monitor']);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch incidents');
    }

    // Transform to get centroids
    const candidates = (incidents as any[]).map(inc => {
      const sigs = inc.incident_signals.map((is: any) => is.signals);
      if (!sigs.length) return null;

      const avgLat = sigs.reduce((sum: number, s: any) => sum + s.lat, 0) / sigs.length;
      const avgLng = sigs.reduce((sum: number, s: any) => sum + s.lng, 0) / sigs.length;

      return {
        id: inc.id,
        type: inc.event_type,
        severity: inc.severity,
        confidence: inc.confidence_score,
        city: inc.city,
        status: inc.status,
        lat: avgLat,
        lng: avgLng,
        distance: 0,
        signal_count: sigs.length,
        user_feedback: inc.incident_feedback || []
      };
    }).filter(x => x !== null);

    // Filter by Haversine Distance
    const results = candidates.map(inc => {
      inc.distance = this.getDistanceFromLatLonInM(lat, lng, inc.lat, inc.lng);
      return inc;
    }).filter(inc => inc.distance <= radiusM);

    // Sort by Distance
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
    const { data: incident, error } = await this.db
      .from('incidents')
      .select(`
        *,
        incident_signals (
          signals (
            *
          )
        ),
        verifications (
          type,
          created_at
        ),
        incident_feedback (
            id,
            user_id,
            type,
            comment,
            created_at
        ),
        incident_lifecycle (
            id,
            to_status,
            changed_by,
            reason,
            created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !incident) {
      console.log('error', error)
      throw new NotFoundException('Incident not found');
    }

    // Transform nested signals structure to flat array
    const flatIncident = {
      ...incident,
      signals: incident.incident_signals.map((is: any) => is.signals),
      lifecycle: incident.incident_lifecycle?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
    };
    delete (flatIncident as any).incident_signals;
    delete (flatIncident as any).incident_lifecycle;

    return flatIncident;
  }

  async resolveIncident(id: string) {
    const { error } = await this.db
      .from('incidents')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException('Failed to resolve incident');
    }

    return { success: true };
  }

  async getIncidentSignals(incidentId: string) {
    const { data, error } = await this.db
      .from('incident_signals')
      .select(`
        signals (
          id,
          source,
          text,
          media_url,
          media_type,
          city_hint,
          event_type,
          created_at,
          happened_at
        )
      `)
      .eq('incident_id', incidentId);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch signals');
    }

    return data?.map((is: any) => is.signals) || [];
  }

  async logLifecycleEvent(
    incidentId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string,
    reason: string,
  ) {
    const { error } = await this.db.from('incident_lifecycle').insert({
      incident_id: incidentId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: changedBy,
      triggered_by: 'system',
      reason: reason,
    });

    if (error) {
      this.logger.error(
        `Failed to log lifecycle event for incident ${incidentId}`,
        error,
      );
    }
  }

  async getIncidentLifecycle(incidentId: string) {
    const { data, error } = await this.db
      .from('incident_lifecycle')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch lifecycle');
    }

    return data || [];
  }

  async submitFeedback(incidentId: string, userId: string, type: 'confirm' | 'reject') {
    // Upsert to allow changing feedback
    const { data, error } = await this.db
      .from('incident_feedback')
      .upsert(
        {
          incident_id: incidentId,
          user_id: userId,
          type,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'incident_id, user_id' }
      )
      .select('id')
      .single();

    if (error) {
      this.logger.error('Failed to submit feedback:', error);
      throw new InternalServerErrorException('Failed to submit feedback');
    }

    return { success: true, feedback_id: data?.id };
  }

  async reprocessPendingSignals() {
    this.logger.log('Manually triggering reprocessing of PENDING signals...');
    const { data: signals, error } = await this.db
      .from('signals')
      .select('*')
      .eq('status', 'pending');

    if (error || !signals) {
      this.logger.error('Failed to fetch pending signals', error);
      return { count: 0, error };
    }

    this.logger.log(`Found ${signals.length} pending signals.`);

    let processed = 0;
    for (const signal of signals) {
      try {
        await this.processSignal(signal.id, signal.lat, signal.lng);
        processed++;
      } catch (e) {
        this.logger.error(`Failed to reprocess signal ${signal.id}`, e);
      }
    }

    return { count: signals.length, processed };
  }
}
