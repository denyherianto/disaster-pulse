import { Module } from '@nestjs/common';
import { ClusterService } from './cluster.service';
import { ClusterController } from './cluster.controller';

import { ReasoningModule } from '../reasoning/reasoning.module';
import { QueueModule } from '../common/queue/queue.module';
import { ClusterProcessor } from './cluster.processor';

@Module({
  imports: [ReasoningModule, QueueModule],
  controllers: [ClusterController],
  providers: [ClusterService, ClusterProcessor]
})
export class ClusterModule {}
