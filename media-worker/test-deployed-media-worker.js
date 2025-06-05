const https = require('https');
const { performance } = require('perf_hooks');

class DeployedMediaWorkerTester {
  constructor() {
    this.baseUrl = 'https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'Azure Container Apps - East US 2',
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
   * Measure latency for HTTPS requests to Azure
   */
  async measureLatency(url, options = {}) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        timeout: 15000,
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
   * Test Azure Container Apps health endpoints
   */
  async testAzureHealthEndpoints() {
    console.log('\n🔍 Testing Azure Container Apps Health Endpoints...');
    
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
        
        // Parse response for Azure-specific info
        if (result.response) {
          try {
            const data = await result.response.json();
            if (data.checks) {
              console.log(`     🔗 Azure Service Checks:`);
              Object.entries(data.checks).forEach(([service, check]) => {
                const status = check.status === 'up' ? '✅' : '❌';
                console.log(`       ${status} ${service}: ${check.status}`);
                if (check.endpoint) {
                  console.log(`         📍 ${check.endpoint}`);
                }
              });
            }
            if (data.uptime) {
              console.log(`     ⏱️ Container Uptime: ${Math.round(data.uptime)}s`);
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
   * Test Azure service connectivity and latency
   */
  async testAzureServiceConnectivity() {
    console.log('\n🌐 Testing Azure Service Connectivity & Latency...');
    
    const url = `${this.baseUrl}/connectivity/test`;
    const result = await this.measureLatency(url);
    
    const testResult = {
      test: 'Azure Services Connectivity',
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
      console.log(`  ✅ Azure Services Test: ${result.latency}ms (HTTP ${result.status})`);
      
      try {
        const connectivityData = await result.response.json();
        
        console.log(`\n🏗️ Azure Infrastructure Status:`);
        console.log(`  📍 Region: ${connectivityData.environment || 'East US 2'}`);
        console.log(`  🕐 Test Time: ${connectivityData.timestamp}`);
        
        console.log(`\n📈 Network Optimizations:`);
        if (connectivityData.networkOptimizations) {
          const opts = connectivityData.networkOptimizations;
          console.log(`  • VNet Integration: ${opts.vnetIntegration ? '✅ ENABLED' : '❌ DISABLED'}`);
          console.log(`  • Private Endpoints: ${opts.privateEndpoints ? '✅ ENABLED' : '❌ DISABLED'}`);
          console.log(`  • Ultra Low Latency: ${opts.ultraLowLatency ? '✅ ENABLED' : '❌ DISABLED'}`);
        }
        
        console.log(`\n🔗 Azure Service Connection Tests:`);
        if (connectivityData.tests) {
          for (const test of connectivityData.tests) {
            const statusIcon = test.status === 'success' ? '✅' : test.status === 'warning' ? '⚠️' : '❌';
            const latencyInfo = test.latency ? ` (${test.latency}ms)` : '';
            console.log(`  ${statusIcon} ${test.service}${latencyInfo}: ${test.message}`);
            if (test.endpoint) {
              console.log(`     🔗 ${test.endpoint}`);
            }
          }
        }
        
        console.log(`\n📊 Performance Summary:`);
        if (connectivityData.summary) {
          console.log(`  • Total Azure Services: ${connectivityData.summary.totalTests || 0}`);
          console.log(`  • Connected: ${connectivityData.summary.successful || 0}`);
          console.log(`  • Failed: ${connectivityData.summary.failed || 0}`);
          console.log(`  • Average Latency: ${connectivityData.summary.averageLatency || 0}ms`);
        }
        
        // Store detailed connectivity results
        this.results.azureConnectivity = connectivityData;
        
      } catch (e) {
        console.log(`  ⚠️ Could not parse Azure connectivity response: ${e.message}`);
      }
    } else {
      this.results.summary.failed++;
      console.log(`  ❌ Azure Services Test: ${result.latency}ms - ${result.error}`);
    }
  }

  /**
   * Test API documentation on Azure
   */
  async testAzureApiDocumentation() {
    console.log('\n📚 Testing Azure API Documentation...');
    
    const url = `${this.baseUrl}/api`;
    const result = await this.measureLatency(url);
    
    const testResult = {
      test: 'Azure API Documentation',
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
      console.log(`  📖 Swagger UI: ${url}`);
    } else {
      this.results.summary.failed++;
      console.log(`  ❌ API Documentation: ${result.latency}ms - ${result.error}`);
    }
  }

  /**
   * Test Azure Container Apps performance under load
   */
  async testAzurePerformance() {
    console.log('\n⚡ Testing Azure Container Apps Performance...');
    
    const endpoint = `${this.baseUrl}/health/live`;
    const requests = 20; // More requests for Azure testing
    const latencies = [];
    
    console.log(`  🔄 Making ${requests} concurrent requests to Azure...`);
    
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
    const p95Latency = Math.round(latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]);
    
    console.log(`  📊 Azure Performance Results:`);
    console.log(`    • Successful: ${successful}/${requests} (${Math.round(successful/requests*100)}%)`);
    console.log(`    • Min Latency: ${minLatency}ms`);
    console.log(`    • Max Latency: ${maxLatency}ms`);
    console.log(`    • Avg Latency: ${avgLatency}ms`);
    console.log(`    • 95th Percentile: ${p95Latency}ms`);
    
    // Performance assessment
    let performanceGrade = 'A';
    if (avgLatency > 500) performanceGrade = 'B';
    if (avgLatency > 1000) performanceGrade = 'C';
    if (avgLatency > 2000) performanceGrade = 'D';
    if (successful < requests * 0.95) performanceGrade = 'F';
    
    console.log(`    🎯 Performance Grade: ${performanceGrade}`);
    
    const testResult = {
      test: 'Azure Performance Load Test',
      url: endpoint,
      status: successful === requests ? 'PASS' : 'PARTIAL',
      latency: avgLatency,
      details: {
        requests,
        successful,
        minLatency,
        maxLatency,
        avgLatency,
        p95Latency,
        performanceGrade
      },
      message: `${successful}/${requests} successful, ${avgLatency}ms avg`
    };

    this.results.tests.push(testResult);
    this.results.summary.total++;
    
    if (successful >= requests * 0.9) { // 90% success rate acceptable
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
   * Run all Azure tests
   */
  async runAllTests() {
    console.log('🚀 Starting Azure Container Apps Media Worker Tests...');
    console.log(`📅 Timestamp: ${this.results.timestamp}`);
    console.log(`🔗 Azure URL: ${this.baseUrl}`);
    console.log(`🌍 Environment: ${this.results.environment}`);
    
    try {
      await this.testAzureHealthEndpoints();
      await this.testAzureServiceConnectivity();
      await this.testAzureApiDocumentation();
      await this.testAzurePerformance();
      
      this.calculateSummary();
      
      console.log('\n' + '='.repeat(70));
      console.log('📋 AZURE DEPLOYMENT TEST SUMMARY');
      console.log('='.repeat(70));
      console.log(`✅ Passed: ${this.results.summary.passed}`);
      console.log(`❌ Failed: ${this.results.summary.failed}`);
      console.log(`📊 Total: ${this.results.summary.total}`);
      console.log(`⚡ Average Latency: ${this.results.summary.averageLatency}ms`);
      console.log(`🎯 Success Rate: ${Math.round((this.results.summary.passed / this.results.summary.total) * 100)}%`);
      
      // Azure-specific summary
      if (this.results.azureConnectivity?.networkOptimizations) {
        const opts = this.results.azureConnectivity.networkOptimizations;
        console.log(`\n🌐 Azure Network Status:`);
        console.log(`   VNet Integration: ${opts.vnetIntegration ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Private Endpoints: ${opts.privateEndpoints ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Ultra Low Latency: ${opts.ultraLowLatency ? 'ENABLED' : 'DISABLED'}`);
      }
      
      console.log(`\n🏗️ Azure Container Apps Status: ${this.results.summary.failed === 0 ? '🟢 HEALTHY' : '🟡 NEEDS ATTENTION'}`);
      console.log('\n💾 Detailed results saved to azure-test-results.json');
      
      // Save detailed results to file
      const fs = require('fs');
      fs.writeFileSync('azure-test-results.json', JSON.stringify(this.results, null, 2));
      
      return this.results.summary.failed === 0;
      
    } catch (error) {
      console.error('\n❌ Azure test execution failed:', error.message);
      return false;
    }
  }
}

// Check if Azure deployment is accessible
async function checkAzureDeployment() {
  try {
    const response = await fetch('https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/health/live', { timeout: 10000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking Azure Container Apps deployment...');
  
  const isDeployed = await checkAzureDeployment();
  
  if (!isDeployed) {
    console.log('❌ Azure Container Apps deployment is not accessible');
    console.log('💡 Next steps:');
    console.log('   1. Make GitHub Container Registry package public');
    console.log('   2. Re-run GitHub Actions workflow');
    console.log('   3. Wait for deployment to complete');
    console.log('   4. Run this test again');
    process.exit(1);
  }
  
  console.log('✅ Azure deployment is accessible!');
  
  const tester = new DeployedMediaWorkerTester();
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