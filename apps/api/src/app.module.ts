import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './supabase/supabase.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SignalsModule } from './signals/signals.module';
import { UserPlacesModule } from './user-places/user-places.module';
import { IncidentsModule } from './incidents/incidents.module';
import { ClusterModule } from './cluster/cluster.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    SignalsModule,
    UserPlacesModule,
    IncidentsModule,
    ClusterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
