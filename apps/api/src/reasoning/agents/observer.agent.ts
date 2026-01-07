import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';

export type ObserverInput = {
  signals: { source: string; text: string; created_at: string }[];
};

export type ObserverOutput = {
  observation_summary: string;
  key_facts: string[];
  timeline: string[];
};

@Injectable()
export class ObserverAgent extends GeminiAgent<ObserverInput, ObserverOutput> {
  protected readonly logger = new Logger(ObserverAgent.name);
  protected readonly role = 'Observer';
  protected readonly model = 'maia/gemini-3-pro-preview';

  constructor(maia: OpenAI) {
    super(maia);
  }

  buildPrompt(input: ObserverInput): string {
    return `
      ROLE: impartial Observer.
      TASK: Read the raw signals and synthesize OBJECTIVE facts. Do not hypothesize or guess.
      
      SIGNALS:
      ${input.signals.map(s => `- [${s.source} @ ${s.created_at}]: ${s.text}`).join('\n')}

      OUTPUT JSON:
      {
        "observation_summary": "Concise summary of WHAT was seen/heard.",
        "key_facts": ["List of verifiable facts extracted"],
        "timeline": ["Chronological list of events if discernible"]
      }
    `;
  }
}
