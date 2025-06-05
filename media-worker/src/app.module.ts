import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { CallModule } from './call/call.module';
import { VoiceLiveModule } from './voice-live/voice-live.module';
import { DatabaseModule } from './database/database.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { ConnectivityModule } from './connectivity/connectivity.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    HealthModule,
    CallModule,
    VoiceLiveModule,
    DatabaseModule,
    TelemetryModule,
    ConnectivityModule,
  ],
})
export class AppModule {} 