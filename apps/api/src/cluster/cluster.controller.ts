import { Controller, Post } from '@nestjs/common';
import { ClusterService } from './cluster.service';

@Controller('cluster')
export class ClusterController {
  constructor(private readonly clusterService: ClusterService) {}

  // @Post('trigger')
  // async triggerClustering() {
  //   return { message: 'Deprecated. System is now event-driven.' };
  // }
}
