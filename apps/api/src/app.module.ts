import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { UploadModule } from './upload/upload.module';
import { QueueModule } from './common/queue/queue.module';

import { SseModule } from './sse/sse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,  // 1 second
        limit: 3,   // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20,  // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    RemoteConfigModule,
    UploadModule,
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
    NotificationsModule,
    AdminModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}


