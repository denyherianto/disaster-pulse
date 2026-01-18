import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './supabase/supabase.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SignalsModule } from './signals/signals.module';
import { UserPlacesModule } from './user-places/user-places.module';
import { UsersModule } from './users/users.module';
import { IncidentsModule } from './incidents/incidents.module';
import { ReasoningModule } from './reasoning/reasoning.module';
import { DatabaseModule } from './database/database.module';
import { TiktokModule } from './sources/tiktok/tiktok.module';
import { RssModule } from './sources/rss/rss.module';
import { ReportsModule } from './sources/reports/reports.module';
import { BmkgModule } from './sources/bmkg/bmkg.module';
import { GuidesModule } from './guides/guides.module';
import { EmergencyContactsModule } from './emergency-contacts/emergency-contacts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RemoteConfigModule } from './config/remote-config.module';
import { AdminModule } from './admin/admin.module';

import { SseModule } from './sse/sse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    RemoteConfigModule,
    SseModule,
    SupabaseModule,
    SignalsModule,
    UserPlacesModule,
    UsersModule,
    IncidentsModule,
    ReasoningModule,
    DatabaseModule,
    TiktokModule,
    RssModule,
    ReportsModule,
    BmkgModule,
    GuidesModule,
    EmergencyContactsModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


