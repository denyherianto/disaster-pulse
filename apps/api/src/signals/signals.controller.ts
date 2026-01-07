import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { SignalsService } from './signals.service';
import { z } from 'zod';

const signalSchema = z.object({
  source: z.enum(['user_report', 'social_media', 'news', 'sensor']),
  text: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  media_url: z.string().url().optional(),
  media_type: z.enum(['image', 'video']).optional(),
  city_hint: z.string().optional(),
  raw_payload: z.record(z.string(), z.any()).optional(),
});

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Post()
  async create(@Body() body: any) {
    const validated = signalSchema.safeParse(body);

    if (!validated.success) {
      throw new BadRequestException({
        error: 'Invalid Input',
        details: validated.error.issues,
      });
    }

    return this.signalsService.createSignal(validated.data);
  }
}
