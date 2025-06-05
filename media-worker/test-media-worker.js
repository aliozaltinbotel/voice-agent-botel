const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

class MediaWorkerTester {
  constructor() {
    this.baseUrl = 'http://localhost:8080';
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        averageLatency: 0
      }
    };
  }

  /**
   * Measure latency for HTTP requests
   */
  async measureLatency(url, options = {}) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        timeout: 10000,
        ...options
      });
      
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      return {
        success: true,
        latency,
        status: response.status,
        statusText: response.statusText,
        response
      };
    } catch (error) {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      return {
        success: false,
        latency,
        error: error.message,
        response: null
      };
    }
  }

  /**
   * Test basic health endpoints
   */
  async testHealthEndpoints() {
    console.log('\n🔍 Testing Health Endpoints...');
    
    const endpoints = [
      { name: 'Health Live', path: '/health/live' },
      { name: 'Health Ready', path: '/health/ready' },
      { name: 'Health Startup', path: '/health/startup' }
    ];

    for (const endpoint of endpoints) {
      const url = `${this.baseUrl}${endpoint.path}`;
      const result = await this.measureLatency(url);
      
      const testResult = {
        test: endpoint.name,
        url,
        status: result.success ? 'PASS' : 'FAIL',
        latency: result.latency,
        httpStatus: result.status,
        message: result.success ? 'OK' : result.error
      };

      this.results.tests.push(testResult);
      this.results.summary.total++;
      
      if (result.success) {
        this.results.summary.passed++;
        console.log(`  ✅ ${endpoint.name}: ${result.latency}ms (HTTP ${result.status})`);
        
        // Parse response for additional info
        if (result.response) {
          try {
            const data = await result.response.json();
            if (data.checks) {
              console.log(`     📊 Service checks:`, JSON.stringify(data.checks, null, 2));
            }
          } catch (e) {
            // Response might not be JSON
          }
        }
      } else {
        this.results.summary.failed++;
        console.log(`  ❌ ${endpoint.name}: ${result.latency}ms - ${result.error}`);
      }
    }
  }

  /**
   * Test connectivity endpoints and measure service latencies
   */
  async testConnectivityAndLatency() {
    console.log('\n🌐 Testing Service Connectivity & Latency...');
    
    const url = `${this.baseUrl}/connectivity/test`;
    const result = await this.measureLatency(url);
    
    const testResult = {
      test: 'Connectivity Test',
      url,
      status: result.success ? 'PASS' : 'FAIL',
      latency: result.latency,
      httpStatus: result.status,
      message: result.success ? 'OK' : result.error
    };

    this.results.tests.push(testResult);
    this.results.summary.total++;
    
    if (result.success) {
      this.results.summary.passed++;
      console.log(`  ✅ Connectivity Test: ${result.latency}ms (HTTP ${result.status})`);
      
      try {
        const connectivityData = await result.response.json();
        
        console.log(`\n📈 Network Optimizations:`);
        console.log(`  • VNet Integration: ${connectivityData.networkOptimizations?.vnetIntegration ? '✅' : '❌'}`);
        console.log(`  • Private Endpoints: ${connectivityData.networkOptimizations?.privateEndpoints ? '✅' : '❌'}`);
        console.log(`  • Ultra Low Latency: ${connectivityData.networkOptimizations?.ultraLowLatency ? '✅' : '❌'}`);
        
        console.log(`\n🔗 Service Connection Tests:`);
        if (connectivityData.tests) {
          for (const test of connectivityData.tests) {
            const statusIcon = test.status === 'success' ? '✅' : test.status === 'warning' ? '⚠️' : '❌';
            const latencyInfo = test.latency ? ` (${test.latency}ms)` : '';
            console.log(`  ${statusIcon} ${test.service}${latencyInfo}: ${test.message}`);
            if (test.endpoint) {
              console.log(`     🔗 Endpoint: ${test.endpoint}`);
            }
          }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`  • Total Tests: ${connectivityData.summary?.totalTests || 0}`);
        console.log(`  • Successful: ${connectivityData.summary?.successful || 0}`);
        console.log(`  • Failed: ${connectivityData.summary?.failed || 0}`);
        console.log(`  • Average Latency: ${connectivityData.summary?.averageLatency || 0}ms`);
        
        // Store detailed connectivity results
        this.results.connectivityDetails = connectivityData;
        
      } catch (e) {
        console.log(`  ⚠️ Could not parse connectivity response: ${e.message}`);
      }
    } else {
      this.results.summary.failed++;
      console.log(`  ❌ Connectivity Test: ${result.latency}ms - ${result.error}`);
    }
  }

  /**
   * Test API documentation endpoint
   */
  async testApiDocumentation() {
    console.log('\n📚 Testing API Documentation...');
    
    const url = `${this.baseUrl}/api`;
    const result = await this.measureLatency(url);
    
    const testResult = {
      test: 'API Documentation',
      url,
      status: result.success ? 'PASS' : 'FAIL',
      latency: result.latency,
      httpStatus: result.status,
      message: result.success ? 'OK' : result.error
    };

    this.results.tests.push(testResult);
    this.results.summary.total++;
    
    if (result.success) {
      this.results.summary.passed++;
      console.log(`  ✅ API Documentation: ${result.latency}ms (HTTP ${result.status})`);
      console.log(`  📖 Swagger UI available at: ${url}`);
    } else {
      this.results.summary.failed++;
      console.log(`  ❌ API Documentation: ${result.latency}ms - ${result.error}`);
    }
  }

  /**
   * Test server response times under load
   */
  async testResponseTimes() {
    console.log('\n⚡ Testing Response Times (Multiple Requests)...');
    
    const endpoint = `${this.baseUrl}/health/live`;
    const requests = 10;
    const latencies = [];
    
    console.log(`  🔄 Making ${requests} concurrent requests...`);
    
    const promises = Array(requests).fill().map(async (_, index) => {
      const result = await this.measureLatency(endpoint);
      latencies.push(result.latency);
      return result;
    });
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    
    console.log(`  📊 Results:`);
    console.log(`    • Successful: ${successful}/${requests}`);
    console.log(`    • Min Latency: ${minLatency}ms`);
    console.log(`    • Max Latency: ${maxLatency}ms`);
    console.log(`    • Avg Latency: ${avgLatency}ms`);
    
    const testResult = {
      test: 'Load Response Times',
      url: endpoint,
      status: successful === requests ? 'PASS' : 'FAIL',
      latency: avgLatency,
      details: {
        requests,
        successful,
        minLatency,
        maxLatency,
        avgLatency
      },
      message: `${successful}/${requests} successful requests`
    };

    this.results.tests.push(testResult);
    this.results.summary.total++;
    
    if (successful === requests) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }
  }

  /**
   * Calculate overall summary
   */
  calculateSummary() {
    const latencies = this.results.tests
      .filter(test => test.latency)
      .map(test => test.latency);
    
    this.results.summary.averageLatency = latencies.length > 0 
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Media Worker Comprehensive Tests...');
    console.log(`📅 Timestamp: ${this.results.timestamp}`);
    console.log(`🔗 Base URL: ${this.baseUrl}`);
    
    try {
      await this.testHealthEndpoints();
      await this.testConnectivityAndLatency();
      await this.testApiDocumentation();
      await this.testResponseTimes();
      
      this.calculateSummary();
      
      console.log('\n' + '='.repeat(60));
      console.log('📋 FINAL TEST SUMMARY');
      console.log('='.repeat(60));
      console.log(`✅ Passed: ${this.results.summary.passed}`);
      console.log(`❌ Failed: ${this.results.summary.failed}`);
      console.log(`📊 Total: ${this.results.summary.total}`);
      console.log(`⚡ Average Latency: ${this.results.summary.averageLatency}ms`);
      console.log(`🎯 Success Rate: ${Math.round((this.results.summary.passed / this.results.summary.total) * 100)}%`);
      
      if (this.results.connectivityDetails?.networkOptimizations) {
        const opts = this.results.connectivityDetails.networkOptimizations;
        console.log(`\n🌐 Network Optimizations Status:`);
        console.log(`   VNet Integration: ${opts.vnetIntegration ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Private Endpoints: ${opts.privateEndpoints ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Ultra Low Latency: ${opts.ultraLowLatency ? 'ENABLED' : 'DISABLED'}`);
      }
      
      console.log('\n💾 Detailed results saved to test-results.json');
      
      // Save detailed results to file
      const fs = require('fs');
      fs.writeFileSync('test-results.json', JSON.stringify(this.results, null, 2));
      
      return this.results.summary.failed === 0;
      
    } catch (error) {
      console.error('\n❌ Test execution failed:', error.message);
      return false;
    }
  }
}

// Check if media worker is running first
async function checkIfRunning() {
  try {
    const response = await fetch('http://localhost:8080/health/live', { timeout: 3000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if Media Worker is running...');
  
  const isRunning = await checkIfRunning();
  
  if (!isRunning) {
    console.log('❌ Media Worker is not running on port 8080');
    console.log('💡 To start the Media Worker, run:');
    console.log('   npm run start:dev');
    console.log('   or');
    console.log('   npm run start');
    process.exit(1);
  }
  
  console.log('✅ Media Worker is running!');
  
  const tester = new MediaWorkerTester();
  const success = await tester.runAllTests();
  
  process.exit(success ? 0 : 1);
}

// Handle global fetch for Node.js versions that don't have it
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
}); 