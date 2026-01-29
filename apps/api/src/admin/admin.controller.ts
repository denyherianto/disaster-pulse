import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { DemoSeedService } from './demo-seed.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly demoSeedService: DemoSeedService,
  ) { }

  // ============================================
  // Demo Endpoints for Video Production
  // ============================================

  @Post('demo/seed')
  async seedDemoData() {
    return this.demoSeedService.seed();
  }

  @Post('demo/reset')
  async resetDemoData() {
    return this.demoSeedService.reset();
  }

  @Post('demo/test-notification')
  async testNotification(
    @Body() body: {
      userId?: string;
      title?: string;
      body?: string;
      eventType?: string;
    },
  ) {
    return this.demoSeedService.testPushNotification(body);
  }

  @Post('demo/test-incident-alert')
  async testIncidentAlert(
    @Body() body: {
      userId?: string;
      eventType?: 'earthquake' | 'flood' | 'fire' | 'landslide' | 'volcano';
      severity?: 'low' | 'medium' | 'high';
      city?: string;
    },
  ) {
    return this.demoSeedService.testIncidentNotification(body);
  }

  @Get('signals')
  async getSignals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('status') status?: string,
    @Query('source') source?: string,
  ) {
    return this.adminService.getSignals({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
      status,
      source,
    });
  }

  @Get('incidents')
  async getIncidents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('status') status?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.adminService.getIncidents({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
      status,
      eventType,
    });
  }

  @Get('traces')
  async getTraces(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('sessionId') sessionId?: string,
    @Query('incidentId') incidentId?: string,
  ) {
    return this.adminService.getTraces({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
      sessionId,
      incidentId,
    });
  }

  @Get('evaluations')
  async getEvaluations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('incidentId') incidentId?: string,
  ) {
    return this.adminService.getEvaluations({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
      incidentId,
    });
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('verifications')
  async getVerifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('type') type?: string,
    @Query('incidentId') incidentId?: string,
  ) {
    return this.adminService.getVerifications({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
      type,
      incidentId,
    });
  }

  @Get('lifecycle')
  async getLifecycle(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('incidentId') incidentId?: string,
  ) {
    return this.adminService.getLifecycle({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
      incidentId,
    });
  }

  @Get('notifications')
  async getNotifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('tab') tab?: 'outbox' | 'audit' | 'states',
  ) {
    return this.adminService.getNotifications({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
      tab,
    });
  }

  @Get('tiktok-posts')
  async getTikTokPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.getTikTokPosts({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }
}
