import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SchemaService } from './schema.service';

@Module({
  imports: [ConfigModule],
  providers: [SchemaService],
  exports: [SchemaService],
})
export class DatabaseModule {}
