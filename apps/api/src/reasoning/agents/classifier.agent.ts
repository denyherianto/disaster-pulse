import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { ObserverOutput } from './observer.agent';

export type ClassifierInput = ObserverOutput;

export type ClassifierOutput = {
  hypotheses: {
    event_type: string;
    description: string;
    likelihood: number; // 0-1
    supporting_evidence: string[];
  }[];
};

@Injectable()
export class ClassifierAgent extends GeminiAgent<ClassifierInput, ClassifierOutput> {
  protected readonly logger = new Logger(ClassifierAgent.name);
  protected readonly role = 'Classifier';
  protected readonly model = 'maia/gemini-3-pro-preview';

  constructor(maia: OpenAI) {
    super(maia);
  }

  buildPrompt(input: ClassifierInput): string {
    return `
      ROLE: Hypothesizer (The Believer).
      TASK: Generate plausible hypotheses explaining the observations. Be creative but grounded.
      
      OBSERVATIONS:
      ${JSON.stringify(input)}

      OUTPUT JSON:
      {
        "hypotheses": [
          {
            "event_type": "flood | fire | earthquake | traffic | protest | other",
            "description": "What is happening?",
            "likelihood": 0.0 to 1.0,
            "supporting_evidence": ["Fact 1", "Fact 2"]
          }
        ]
      }
    `;
  }
}
