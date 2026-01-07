import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ObserverAgent } from './agents/observer.agent';
import { ClassifierAgent } from './agents/classifier.agent';
import { SkepticAgent } from './agents/skeptic.agent';
import { SynthesizerAgent } from './agents/synthesizer.agent';
import { ActionAgent } from './agents/action.agent';

@Injectable()
export class ReasoningService {
  private readonly logger = new Logger(ReasoningService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly observer: ObserverAgent,
    private readonly classifier: ClassifierAgent,
    private readonly skeptic: SkepticAgent,
    private readonly synthesizer: SynthesizerAgent,
    private readonly action: ActionAgent,
  ) {}

  async runReasoningLoop(
    signals: { source: string; text: string; created_at: string }[],
    existingIncidents: { id: string; type: string; city: string }[],
    clusterId?: string
  ) {
    const sessionId = crypto.randomUUID();
    this.logger.log(`Starting Reasoning Session ${sessionId} for ${signals.length} signals`);

    try {
      // 1. Observer
      const { result: observation, trace: t1 } = await this.observer.run({ signals });
      await this.saveTrace(sessionId, t1, clusterId);

      // 2. Classifier
      const { result: hypotheses, trace: t2 } = await this.classifier.run(observation);
      await this.saveTrace(sessionId, t2, clusterId);

      // 3. Skeptic
      const { result: critique, trace: t3 } = await this.skeptic.run({ observations: observation, hypotheses });
      await this.saveTrace(sessionId, t3, clusterId);

      // 4. Synthesizer
      const { result: conclusion, trace: t4 } = await this.synthesizer.run({ observations: observation, hypotheses, critique });
      await this.saveTrace(sessionId, t4, clusterId);

      // 5. Action
      const { result: decision, trace: t5 } = await this.action.run({ conclusion, existingIncidents });
      await this.saveTrace(sessionId, t5, clusterId);

      return {
        conclusion,
        decision,
        sessionId
      };

    } catch (error) {
      this.logger.error('Reasoning Loop Failed:', error);
      throw error;
    }
  }

  private async saveTrace(sessionId: string, trace: any, clusterId?: string) {
    // Fire and forget trace logging
    (this.supabase.getClient().from('agent_traces') as any).insert({
      session_id: sessionId,
      cluster_id: clusterId,
      step: trace.step,
      input_context: trace.input,
      output_result: trace.output,
      model_used: trace.model,
      created_at: trace.timestamp
    }).then(({ error }) => {
      if (error) this.logger.warn('Failed to save trace:', error);
    });
  }
}
