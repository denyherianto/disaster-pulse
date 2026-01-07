import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { ObserverOutput } from './observer.agent';
import { ClassifierOutput } from './classifier.agent';

export type SkepticInput = {
  observations: ObserverOutput;
  hypotheses: ClassifierOutput;
};

export type SkepticOutput = {
  concerns: string[];
  contradictions: string[];
  alternative_explanations: string[];
  assessment: string;
};

@Injectable()
export class SkepticAgent extends GeminiAgent<SkepticInput, SkepticOutput> {
  protected readonly logger = new Logger(SkepticAgent.name);
  protected readonly role = 'Skeptic';
  protected readonly model = 'maia/gemini-3-pro-preview';

  constructor(maia: OpenAI) {
    super(maia);
  }

  buildPrompt(input: SkepticInput): string {
    return `
      ROLE: The Skeptic (The Critic).
      TASK: Aggressively challenge the proposed hypotheses. Look for missing data, bias, or jumping to conclusions.
      
      OBSERVATIONS:
      ${JSON.stringify(input.observations)}
      
      PROPOSED HYPOTHESES:
      ${JSON.stringify(input.hypotheses)}

      OUTPUT JSON:
      {
        "concerns": ["List of logical gaps or weak evidence"],
        "contradictions": ["Facts that contradict the hypotheses"],
        "alternative_explanations": ["Benign explanations? e.g. Just rain, not flood"],
        "assessment": "Brief critique."
      }
    `;
  }
}
