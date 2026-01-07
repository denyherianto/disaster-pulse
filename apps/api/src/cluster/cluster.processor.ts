import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ClusterService } from './cluster.service';

@Processor('clustering-queue')
export class ClusterProcessor {
  private readonly logger = new Logger(ClusterProcessor.name);

  constructor(private readonly clusterService: ClusterService) {}

  @Process('cluster-signals')
  async handleClusterSignals(job: Job<{ signalId: string; lat: number; lng: number; severity: string }>) {
    this.logger.debug(`Processing clustering job ${job.id} for signal ${job.data.signalId} (Severity: ${job.data.severity})`);
    
    // Process single signal event
    await this.clusterService.processSignal(
      job.data.signalId,
      job.data.lat,
      job.data.lng,
    );
    
    this.logger.debug(`Clustering job ${job.id} completed`);
  }
}
