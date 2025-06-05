import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VoiceLiveService } from '../voice-live/voice-live.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly voiceLiveService: VoiceLiveService) {}

  @Get('ready')
  @ApiOperation({ summary: 'Check if the service is ready to accept requests' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async checkReady() {
    const memoryUsage = process.memoryUsage();
    const isVoiceLiveHealthy = this.voiceLiveService.isConnected();
    
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        voiceLive: {
          status: isVoiceLiveHealthy ? 'up' : 'down',
          endpoint: this.voiceLiveService.getEndpoint(),
        },
        memory: {
          status: memoryUsage.heapUsed < 200 * 1024 * 1024 ? 'ok' : 'warning', // 200MB threshold
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        },
      },
    };

    return status;
  }

  @Get('live')
  @ApiOperation({ summary: 'Check if the service is alive' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async checkLive() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('startup')
  @ApiOperation({ summary: 'Check if the service has started successfully' })
  @ApiResponse({ status: 200, description: 'Service started successfully' })
  async checkStartup() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Service started successfully',
    };
  }
} 