import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';

export type ResolutionInput = {
  incidentSeverity: string;
  signals: {
    source: string;
    text: string | null;
    created_at: string;
  }[];
};

export type ResolutionOutput = {
  resolution_confidence: number;
  reason: string;
};

@Injectable()
export class IncidentResolutionAgent extends GeminiAgent<ResolutionInput, ResolutionOutput> {
  protected readonly logger = new Logger(IncidentResolutionAgent.name);
  protected readonly role = 'IncidentResolution';
  protected readonly model = 'maia/gemini-3-pro-preview';

  constructor(maia: OpenAI) {
    super(maia);
  }

  buildPrompt(input: ResolutionInput): string {
    return `
      ROLE: Incident Resolver.
      TASK: Determine if the event is OVER (aftermath, cleanup, past tense) or ONGOING based on signal analysis.

      Analyze these recent signals for an incident (Severity: ${input.incidentSeverity}).
      
      Signals:
      ${input.signals.map((s) => `- [${s.source}] ${s.text} (${s.created_at})`).join('\n')}

      Return JSON:
      {
        "resolution_confidence": number (0-1, 1 means definitely resolved),
        "reason": "short explanation"
      }
    `;
  }
}
