import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DemoSeedService } from './demo-seed.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [SupabaseModule, SseModule],
  controllers: [AdminController],
  providers: [AdminService, DemoSeedService],
})
export class AdminModule {}
