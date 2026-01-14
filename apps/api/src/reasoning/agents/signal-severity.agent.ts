import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import { GoogleMapsTool } from '../tools/google-maps.tool';
import OpenAI from 'openai';

export type SignalSeverityInput = {
  text: string;
  source: string;
  lat?: string
  lng?: string
  city_hint?: string
};

export type SignalSeverityOutput = {
  severity: 'low' | 'medium' | 'high';
  urgency_score: number; // 0-1
  reason: string;
  location: string | null;
  event_type: string;
  lat: string | null;
  lng: string | null;
};

@Injectable()
export class SignalSeverityAgent extends GeminiAgent<SignalSeverityInput, SignalSeverityOutput> {
  protected readonly logger = new Logger(SignalSeverityAgent.name);
  protected readonly role = 'SignalSeverity';
  protected readonly model = 'maia/gemini-3-pro-preview'; // High speed model

  constructor(
    maia: OpenAI,
    private readonly googleMapsTool: GoogleMapsTool
  ) {
    super(maia);
    this.tools = [this.googleMapsTool.definition];
  }

  protected async executeTool(name: string, args: any): Promise<any> {
    if (name === 'geocode_location') {
      return this.googleMapsTool.geocode(args.address);
    }
    throw new Error(`Unknown tool: ${name}`);
  }

  buildPrompt(input: SignalSeverityInput): string {
    return `
      ROLE: Emergency Triage.
      TASK: Rate the severity/urgency of this incoming signal immediately. AND extract location and event type if possible.

      SIGNAL:
      [${input.source}] ${input.text}

      LOCATION HINT:
      - lat:  ${input.lat}
      - lng:  ${input.lng}
      - city_hint:  ${input.city_hint}

      GUIDELINES:
      - HIGH: Life-threatening, verified disaster, "HELP", "SOS", widespread destruction.
      - MEDIUM: Property damage, potential threat, warning signs.
      - LOW: News discussion, past event, joke, minor inconvenience.
      - EVENT TYPE: Classify the disaster type (flood, earthquake, whirlwind (Puting Beliung), fire, landslide, power_outage, accident). Never classify as "other", just reject if yes.

      OUTPUT JSON:
      {
        "severity": "low | medium | high",
        "urgency_score": 0.0 to 1.0,
        "reason": "Max 5 words",
        "location": Infer location (City/Province) from title/description/lat & lng/city_hint if possible with this format: "City, Province". If not possible, return null,
        "event_type": "disaster type inferred from text",
        "lat": "Infer latitude from location if possible. Center of the location.",
        "event_type": "disaster type inferred from text",
        "lat": "Latitude from tool or null",
        "lng": "Longitude from tool or null",
      }
      
      IMPORTANT: If the signal text contains a specific location (e.g. 'Fire at Pasar Senen') but you don't have coordinates, USE the 'geocode_location' tool to get accurate lat/lng.
    `;
  }
}
