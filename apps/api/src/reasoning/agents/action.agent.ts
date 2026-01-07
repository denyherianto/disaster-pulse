import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { SynthesizerOutput } from './synthesizer.agent';

export type ActionInput = {
  conclusion: SynthesizerOutput;
  existingIncidents: { id: string; type: string; city: string }[]; // Simplified
};

export type ActionOutput = {
  action: 'CREATE_INCIDENT' | 'MERGE_INCIDENT' | 'WAIT_FOR_MORE_DATA' | 'DISMISS';
  target_incident_id?: string;
  reason: string;
};

@Injectable()
export class ActionAgent extends GeminiAgent<ActionInput, ActionOutput> {
  protected readonly logger = new Logger(ActionAgent.name);
  protected readonly role = 'ActionStrategy';
  protected readonly model = 'maia/gemini-3-pro-preview';

  constructor(maia: OpenAI) {
    super(maia);
  }

  buildPrompt(input: ActionInput): string {
    return `
      ROLE: Strategist.
      TASK: Decides the system action based on the Synthesizer's conclusion and current system state.
      
      CONCLUSION:
      ${JSON.stringify(input.conclusion)}
      
      EXISTING INCIDENTS (nearby):
      ${JSON.stringify(input.existingIncidents)}

      RULES:
      - If confidence < 0.6, WAIT_FOR_MORE_DATA.
      - If confidence > 0.6 and similar incident exists, MERGE_INCIDENT.
      - If confidence > 0.6 and no similar incident, CREATE_INCIDENT.
      - If conclusion is "other" or "benign", DISMISS.

      OUTPUT JSON:
      {
        "action": "CREATE_INCIDENT | MERGE_INCIDENT | WAIT_FOR_MORE_DATA | DISMISS",
        "target_incident_id": "UUID if merging",
        "reason": "Why?"
      }
    `;
  }
}
