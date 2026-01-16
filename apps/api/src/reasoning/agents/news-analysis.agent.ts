import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';

export interface NewsAnalysisInput {
  title: string;
  description: string;
  content?: string;
  pubDate: string;
  source: string;
  link: string;
}

export interface NewsAnalysisResult {
  is_disaster_related: boolean;
  is_current_event: boolean;
  is_real_event: boolean;
  confidence_score: number;
  event_type: string | null;
  location_inference: string | null;
  summary: string | null;
  happened_at: string | null;
  reason: string;
}

@Injectable()
export class NewsAnalysisAgent extends GeminiAgent<NewsAnalysisInput, NewsAnalysisResult> {
  protected readonly logger = new Logger(NewsAnalysisAgent.name);
  protected readonly role = 'NewsAnalysis';
  protected readonly model = 'maia/gemini-2.5-flash';

  constructor(maia: OpenAI) {
    super(maia);
  }

  buildPrompt(input: NewsAnalysisInput): string {
    return `
ROLE: Disaster Intelligence Analyst.
TASK: Analyze Indonesian news articles to identify REAL, CURRENT disaster events.
CONTEXT: All times are UTC+7 (Western Indonesia Time). Events must be CURRENT/ONGOING relative to this timezone.

You are a disaster intelligence analyst specializing in Indonesian news. Your task is to analyze news articles and determine:
1. Is this about a real disaster event (not speculation, prevention tips, or historical recap)?
2. Is this a CURRENT/ONGOING event (not old news being reshared)?
3. What type of disaster is it?
4. Where is it happening (city/region in Indonesia)?

You must be SKEPTICAL. Many articles are:
- Old news being republished
- General disaster preparedness articles
- Historical retrospectives
- Speculative warnings

Only mark as real and current if the article describes an ACTIVE incident with specific details.

Analyze this news article:

Title: ${input.title}
Description: ${input.description}
${input.content ? `Content: ${input.content.substring(0, 2000)}` : ''}
Published: ${input.pubDate}
Source: ${input.source}
Link: ${input.link}

Respond in JSON format:
{
  "is_disaster_related": boolean,
  "is_current_event": boolean,
  "is_real_event": boolean,
  "confidence_score": 0.0-1.0,
  "event_type": "flood|earthquake|fire|landslide|tsunami|power_outage|other" or null,
  "location_inference": Infer location (City/Province) from title/description if possible with this format: "City, Province",
  "summary": "Brief 1-2 sentence summary of the incident" or null,
  "happened_at": "ISO timestamp if determinable" or null,
  "reason": "Brief explanation of your assessment"
}`;
  }
}
