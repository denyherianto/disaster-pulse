import { Module } from '@nestjs/common';
import { BmkgService } from './bmkg.service';
import { SignalsModule } from '../../signals/signals.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { ReasoningModule } from '../../reasoning/reasoning.module';

@Module({
  imports: [SignalsModule, SupabaseModule, ReasoningModule],
  providers: [BmkgService],
  exports: [BmkgService]
})
export class BmkgModule {}
