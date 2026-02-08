import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SkipThrottle } from '@nestjs/throttler';
import { SseService } from './sse.service';

@Controller('sse')
@SkipThrottle()
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('events')
  sse(): Observable<MessageEvent> {
    return this.sseService.getEvents();
  }
}
