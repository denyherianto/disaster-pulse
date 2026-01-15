import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class NewsAnalysisAgent {
  private readonly logger = new Logger(NewsAnalysisAgent.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('MAIA_API_KEY'),
      baseURL: 'https://api.maiarouter.ai/v1',
    });
  }

  async run(input: NewsAnalysisInput): Promise<{ result: NewsAnalysisResult }> {
    const systemPrompt = `
ROLE: Disaster Intelligence Analyst.
TASK: Analyze Indonesian news articles to identify REAL, CURRENT disaster events.

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

Only mark as real and current if the article describes an ACTIVE incident with specific details.`;

    const userPrompt = `Analyze this news article:

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

    try {
      const response = await this.openai.chat.completions.create({
        model: 'maia/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content) as NewsAnalysisResult;

      this.logger.debug(`News analysis for "${input.title}": ${result.is_real_event ? 'VALID' : 'REJECTED'}`);

      return { result };
    } catch (error) {
      this.logger.error('Failed to analyze news article', error);
      return {
        result: {
          is_disaster_related: false,
          is_current_event: false,
          is_real_event: false,
          confidence_score: 0,
          event_type: null,
          location_inference: null,
          summary: null,
          happened_at: null,
          reason: 'Analysis failed due to error',
        },
      };
    }
  }
}
