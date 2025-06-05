import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CosmosClient } from '@azure/cosmos';

interface ConnectivityTest {
  service: string;
  status: 'success' | 'error' | 'warning';
  latency?: number;
  message: string;
  endpoint?: string;
}

interface ConnectivityReport {
  timestamp: string;
  environment: string;
  networkOptimizations: {
    vnetIntegration: boolean;
    privateEndpoints: boolean;
    ultraLowLatency: boolean;
  };
  tests: ConnectivityTest[];
  summary: {
    totalTests: number;
    successful: number;
    failed: number;
    averageLatency: number;
  };
}

@Injectable()
export class ConnectivityService {
  private readonly logger = new Logger(ConnectivityService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Test connectivity to all Azure services
   */
  async testAllConnections(): Promise<ConnectivityReport> {
    const startTime = Date.now();
    const tests: ConnectivityTest[] = [];

    this.logger.log('Starting comprehensive connectivity tests...');

    // Test Voice Live API
    tests.push(await this.testVoiceLiveApi());

    // Test Speech Services
    tests.push(await this.testSpeechServices());

    // Test Cosmos DB
    tests.push(await this.testCosmosDb());

    // Test Application Insights
    tests.push(await this.testApplicationInsights());

    // Test Azure Key Vault (if configured)
    tests.push(await this.testKeyVault());

    // Calculate summary
    const successful = tests.filter(t => t.status === 'success').length;
    const failed = tests.filter(t => t.status === 'error').length;
    const averageLatency = tests
      .filter(t => t.latency !== undefined)
      .reduce((sum, t) => sum + (t.latency || 0), 0) / tests.length;

    const report: ConnectivityReport = {
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('server.env') || 'unknown',
      networkOptimizations: {
        vnetIntegration: this.configService.get<boolean>('network.vnetIntegration') || false,
        privateEndpoints: this.configService.get<boolean>('network.enablePrivateEndpoints') || false,
        ultraLowLatency: this.configService.get<boolean>('network.ultraLowLatency') || false,
      },
      tests,
      summary: {
        totalTests: tests.length,
        successful,
        failed,
        averageLatency: Math.round(averageLatency),
      },
    };

    this.logger.log(`Connectivity tests completed: ${successful}/${tests.length} successful`);
    return report;
  }

  /**
   * Test Voice Live API connectivity (Azure Speech Services WebSocket)
   */
  private async testVoiceLiveApi(): Promise<ConnectivityTest> {
    const startTime = Date.now();
    const endpoint = this.configService.get<string>('voiceLive.endpoint');
    const enabled = this.configService.get<boolean>('voiceLive.enabled');
    const speechKey = this.configService.get<string>('speech.key');

    try {
      if (!enabled) {
        return {
          service: 'Voice Live API',
          status: 'warning',
          message: 'Voice Live API is disabled',
          endpoint,
        };
      }

      if (!endpoint) {
        return {
          service: 'Voice Live API',
          status: 'error',
          message: 'Voice Live endpoint not configured',
        };
      }

      if (!speechKey) {
        return {
          service: 'Voice Live API',
          status: 'error',
          message: 'Speech service key required for Voice Live API',
          endpoint,
        };
      }

      // Test Azure Speech Services WebSocket endpoint with proper authentication
      return new Promise((resolve) => {
        const url = new URL(endpoint);
        url.searchParams.set('language', 'en-US');
        url.searchParams.set('format', 'simple');

        const ws = new (require('ws'))(url.toString(), {
          headers: {
            'Ocp-Apim-Subscription-Key': speechKey,
            'X-ConnectionId': `test-${Date.now()}`,
          },
          timeout: 5000,
        });

        const timeout = setTimeout(() => {
          ws.terminate();
          const latency = Date.now() - startTime;
          resolve({
            service: 'Voice Live API',
            status: 'error',
            latency,
            message: 'Connection timeout after 5 seconds',
            endpoint,
          });
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          const latency = Date.now() - startTime;
          resolve({
            service: 'Voice Live API',
            status: 'success',
            latency,
            message: 'WebSocket connection successful',
            endpoint,
          });
        });

        ws.on('error', (error: Error) => {
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          resolve({
            service: 'Voice Live API',
            status: 'error',
            latency,
            message: `WebSocket error: ${error.message}`,
            endpoint,
          });
        });
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Voice Live API',
        status: 'error',
        latency,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        endpoint,
      };
    }
  }

  /**
   * Test Speech Services connectivity
   */
  private async testSpeechServices(): Promise<ConnectivityTest> {
    const startTime = Date.now();
    const endpoint = this.configService.get<string>('speech.endpoint');
    const key = this.configService.get<string>('speech.key');

    try {
      if (!endpoint || !key) {
        return {
          service: 'Speech Services',
          status: 'error',
          message: 'Speech Services endpoint or key not configured',
          endpoint,
        };
      }

      // Test Speech Services endpoint accessibility
      const testUrl = `${endpoint.replace(/\/$/, '')}/speechtotext/v3.1/models/base`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
        },
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          service: 'Speech Services',
          status: 'success',
          latency,
          message: 'Health check passed',
          endpoint,
        };
      }

      return {
        service: 'Speech Services',
        status: 'error',
        latency,
        message: `HTTP ${response.status}: ${response.statusText}`,
        endpoint,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Speech Services',
        status: 'error',
        latency,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        endpoint,
      };
    }
  }

  /**
   * Test Cosmos DB connectivity
   */
  private async testCosmosDb(): Promise<ConnectivityTest> {
    const startTime = Date.now();
    const endpoint = this.configService.get<string>('cosmos.endpoint');
    const key = this.configService.get<string>('cosmos.key');
    const database = this.configService.get<string>('cosmos.database');

    try {
      if (!endpoint || !key) {
        return {
          service: 'Cosmos DB',
          status: 'error',
          message: 'Cosmos DB endpoint or key not configured',
          endpoint,
        };
      }

      const client = new CosmosClient({
        endpoint,
        key,
      });

      // Test database accessibility
      const { database: db } = await client.database(database || 'voice-agent-db').read();
      const latency = Date.now() - startTime;

      return {
        service: 'Cosmos DB',
        status: 'success',
        latency,
        message: `Database "${db.id}" accessible`,
        endpoint,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Cosmos DB',
        status: 'error',
        latency,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        endpoint,
      };
    }
  }

  /**
   * Test Application Insights connectivity
   */
  private async testApplicationInsights(): Promise<ConnectivityTest> {
    const startTime = Date.now();
    const connectionString = this.configService.get<string>('applicationInsights.connectionString');

    try {
      if (!connectionString) {
        return {
          service: 'Application Insights',
          status: 'warning',
          message: 'Application Insights connection string not configured',
        };
      }

      // Parse connection string to get ingestion endpoint
      const match = connectionString.match(/IngestionEndpoint=([^;]+)/);
      if (!match) {
        return {
          service: 'Application Insights',
          status: 'error',
          message: 'Invalid Application Insights connection string format',
        };
      }

      const ingestionEndpoint = match[1];
      
      // Test ingestion endpoint accessibility
      const response = await fetch(ingestionEndpoint, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      return {
        service: 'Application Insights',
        status: 'success',
        latency,
        message: 'Ingestion endpoint accessible',
        endpoint: ingestionEndpoint,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Application Insights',
        status: 'error',
        latency,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Test Azure Key Vault connectivity
   */
  private async testKeyVault(): Promise<ConnectivityTest> {
    const startTime = Date.now();
    const keyVaultName = this.configService.get<string>('azure.keyVaultName');

    try {
      if (!keyVaultName) {
        return {
          service: 'Azure Key Vault',
          status: 'warning',
          message: 'Key Vault name not configured',
        };
      }

      const endpoint = `https://${keyVaultName}.vault.azure.net/`;
      
      // Test Key Vault endpoint accessibility
      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      // 401 or 403 is expected without proper authentication
      if (response.status === 401 || response.status === 403 || response.ok) {
        return {
          service: 'Azure Key Vault',
          status: 'success',
          latency,
          message: 'Endpoint accessible (authentication required)',
          endpoint,
        };
      }

      return {
        service: 'Azure Key Vault',
        status: 'error',
        latency,
        message: `HTTP ${response.status}: ${response.statusText}`,
        endpoint,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Azure Key Vault',
        status: 'error',
        latency,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
} 