import { Module } from '@nestjs/common';
import { GuidesController } from './guides.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [GuidesController],
})
export class GuidesModule {}
