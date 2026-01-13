import { Controller, Post, Body, Get, Param, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { CreateReportDto } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async createReport(@Body() dto: CreateReportDto) {
    // Validation
    if (!dto.user_id) {
      throw new BadRequestException('user_id is required');
    }
    if (!dto.lat || !dto.lng) {
      throw new BadRequestException('Location (lat, lng) is required');
    }
    if (!dto.event_type) {
      throw new BadRequestException('event_type is required');
    }
    if (!dto.description) {
      throw new BadRequestException('description is required');
    }

    return this.reportsService.createReport(dto);
  }

  @Get('user/:userId')
  async getUserReports(@Param('userId') userId: string) {
    return this.reportsService.getReportsByUser(userId);
  }
}
