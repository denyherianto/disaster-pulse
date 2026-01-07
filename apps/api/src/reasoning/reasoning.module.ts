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
import { SignalSeverityAgent } from './agents/signal-severity.agent';

@Module({
  imports: [ConfigModule, SupabaseModule],
  providers: [
    ReasoningService,
    ObserverAgent,
    ClassifierAgent,
    SkepticAgent,
    SynthesizerAgent,
    ActionAgent,
    SignalSeverityAgent,
    {
      provide: OpenAI,
      useFactory: (configService: ConfigService) => new OpenAI({
        apiKey: configService.get<string>('MAIA_API_KEY'),
        baseURL: 'https://api.maiarouter.ai/v1',
      }),
      inject: [ConfigService],
    }
  ],
  exports: [ReasoningService, SignalSeverityAgent],
})
export class ReasoningModule {}
