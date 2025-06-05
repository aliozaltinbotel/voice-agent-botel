import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);
  private isEnabled = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const connectionString = this.configService.get<string>('applicationInsights.connectionString');
    
    if (!connectionString) {
      this.logger.warn('Application Insights connection string not found, telemetry disabled');
      return;
    }

    this.isEnabled = true;
    this.logger.log('Telemetry service initialized (Application Insights integration can be added)');
  }

  trackEvent(name: string, properties?: Record<string, string>, measurements?: Record<string, number>) {
    if (!this.isEnabled) return;
    
    this.logger.log(`Event: ${name}`, { properties, measurements });
  }

  trackMetric(name: string, value: number, properties?: Record<string, string>) {
    if (!this.isEnabled) return;
    
    this.logger.log(`Metric: ${name} = ${value}`, { properties });
  }

  trackException(exception: Error, properties?: Record<string, string>) {
    if (!this.isEnabled) return;
    
    this.logger.error(`Exception: ${exception.message}`, exception.stack, { properties });
  }

  // Event handlers for automatic telemetry
  @OnEvent('call.started')
  handleCallStarted(data: any) {
    this.trackEvent('CallStarted', {
      callId: data.callId,
      from: data.from,
      to: data.to,
      direction: data.direction,
    });
  }

  @OnEvent('call.ended')
  handleCallEnded(data: any) {
    this.trackEvent('CallEnded', {
      callId: data.callInfo.callId,
      from: data.callInfo.from,
      to: data.callInfo.to,
      status: data.callInfo.status,
    }, {
      duration: data.duration,
    });
  }

  @OnEvent('call.failed')
  handleCallFailed(data: any) {
    this.trackEvent('CallFailed', {
      callId: data.callInfo.callId,
      error: data.error?.message || 'Unknown error',
    });
    
    if (data.error) {
      this.trackException(data.error, {
        callId: data.callInfo.callId,
      });
    }
  }

  @OnEvent('demo.scheduled')
  handleDemoScheduled(data: any) {
    this.trackEvent('DemoScheduled', {
      confirmationId: data.confirmationId,
      companyName: data.companyName,
      email: data.email,
      date: data.date,
      time: data.time,
    }, {
      propertyCount: data.propertyCount || 0,
    });
  }

  @OnEvent('voice-live.error')
  handleVoiceLiveError(error: Error) {
    this.trackException(error, {
      source: 'VoiceLive',
    });
  }
} 