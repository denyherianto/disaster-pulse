import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { IncidentProcessor } from './incident.processor';
import { ReasoningModule } from '../reasoning/reasoning.module';
import { QueueModule } from '../common/queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ReasoningModule, QueueModule, NotificationsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentProcessor],
  exports: [IncidentsService],
})
export class IncidentsModule {}

