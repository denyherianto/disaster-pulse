import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SupabaseModule } from '../supabase/supabase.module';
import { ReasoningService } from './reasoning.service';
import { ObserverAgent } from './agents/observer.agent';
import { ClassifierAgent } from './agents/classifier.agent';
import { SkepticAgent } from './agents/skeptic.agent';
import { SynthesizerAgent } from './agents/synthesizer.agent';
import { ActionAgent } from './agents/action.agent';
import { SignalEnrichmentAgent } from './agents/signal-enrichment.agent';
import { VideoAnalysisAgent } from './agents/video-analysis.agent';
import { NewsAnalysisAgent } from './agents/news-analysis.agent';
import { IncidentResolutionAgent } from './agents/incident-resolution.agent';
import { GoogleMapsTool } from './tools/google-maps.tool';

@Module({
  imports: [ConfigModule, SupabaseModule],
  providers: [
    ReasoningService,
    ObserverAgent,
    ClassifierAgent,
    SkepticAgent,
    SynthesizerAgent,
    ActionAgent,
    SignalEnrichmentAgent,
    VideoAnalysisAgent,
    NewsAnalysisAgent,
    IncidentResolutionAgent,
    GoogleMapsTool,
    {
      provide: OpenAI,
      useFactory: (configService: ConfigService) => new OpenAI({
        apiKey: configService.get<string>('MAIA_API_KEY'),
        baseURL: 'https://api.maiarouter.ai/v1',
      }),
      inject: [ConfigService],
    }
  ],
  exports: [ReasoningService, SignalEnrichmentAgent, VideoAnalysisAgent, NewsAnalysisAgent, IncidentResolutionAgent],
})
export class ReasoningModule {}
