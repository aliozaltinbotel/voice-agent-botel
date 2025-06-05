import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConnectivityService } from './connectivity.service';

@ApiTags('connectivity')
@Controller('connectivity')
export class ConnectivityController {
  constructor(private readonly connectivityService: ConnectivityService) {}

  @Get('test')
  @ApiOperation({ 
    summary: 'Test connectivity to all Azure services',
    description: 'Performs comprehensive connectivity tests to all configured Azure services including latency measurements'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Connectivity test results',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        environment: { type: 'string' },
        networkOptimizations: {
          type: 'object',
          properties: {
            vnetIntegration: { type: 'boolean' },
            privateEndpoints: { type: 'boolean' },
            ultraLowLatency: { type: 'boolean' }
          }
        },
        tests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              service: { type: 'string' },
              status: { type: 'string', enum: ['success', 'error', 'warning'] },
              latency: { type: 'number' },
              message: { type: 'string' },
              endpoint: { type: 'string' }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalTests: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            averageLatency: { type: 'number' }
          }
        }
      }
    }
  })
  async testConnectivity(): Promise<any> {
    return await this.connectivityService.testAllConnections();
  }
} 