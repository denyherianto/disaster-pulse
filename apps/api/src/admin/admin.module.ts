import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DemoSeedService } from './demo-seed.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SseModule } from '../sse/sse.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SupabaseModule, SseModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService, DemoSeedService],
})
export class AdminModule {}
