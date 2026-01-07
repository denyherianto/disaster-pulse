import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';

export type SignalSeverityInput = {
  text: string;
  source: string;
};

export type SignalSeverityOutput = {
  severity: 'low' | 'medium' | 'high';
  urgency_score: number; // 0-1
  reason: string;
};

@Injectable()
export class SignalSeverityAgent extends GeminiAgent<SignalSeverityInput, SignalSeverityOutput> {
  protected readonly logger = new Logger(SignalSeverityAgent.name);
  protected readonly role = 'SignalSeverity';
  protected readonly model = 'maia/gemini-2.5-flash'; // High speed model

  constructor(maia: OpenAI) {
    super(maia);
  }

  buildPrompt(input: SignalSeverityInput): string {
    return `
      ROLE: Emergency Triage.
      TASK: Rate the severity/urgency of this incoming signal immediately.
      
      SIGNAL:
      [${input.source}] ${input.text}

      GUIDELINES:
      - HIGH: Life-threatening, verified disaster, "HELP", "SOS", widespread destruction.
      - MEDIUM: Property damage, potential threat, warning signs.
      - LOW: News discussion, past event, joke, minor inconvenience.

      OUTPUT JSON:
      {
        "severity": "low | medium | high",
        "urgency_score": 0.0 to 1.0,
        "reason": "Max 5 words"
      }
    `;
  }
}
