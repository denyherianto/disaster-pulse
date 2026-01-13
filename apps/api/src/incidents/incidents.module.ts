import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { IncidentProcessor } from './incident.processor';
import { ReasoningModule } from '../reasoning/reasoning.module';
import { QueueModule } from '../common/queue/queue.module';

@Module({
  imports: [ReasoningModule, QueueModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentProcessor],
  exports: [IncidentsService],
})
export class IncidentsModule {}
