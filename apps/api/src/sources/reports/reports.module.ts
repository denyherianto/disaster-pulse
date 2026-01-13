import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SupabaseModule } from '../../supabase/supabase.module';
import { SignalsModule } from '../../signals/signals.module';

@Module({
  imports: [SupabaseModule, SignalsModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
