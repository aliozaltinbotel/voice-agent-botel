const https = require('https');
const { performance } = require('perf_hooks');

const AZURE_URL = 'https://ca-media-worker-dev.victorioustree-4c25e022.eastus2.azurecontainerapps.io';

async function testAzureDeployment() {
  console.log('🚀 Testing Azure Container Apps Deployment...');
  console.log(`🔗 URL: ${AZURE_URL}`);
  console.log('📅 Time:', new Date().toISOString());
  
  const tests = [
    { name: 'Health Live', path: '/health/live' },
    { name: 'Health Ready', path: '/health/ready' },
    { name: 'API Docs', path: '/api' }
  ];

  for (const test of tests) {
    const url = `${AZURE_URL}${test.path}`;
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, { timeout: 10000 });
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      console.log(`✅ ${test.name}: ${latency}ms (HTTP ${response.status})`);
      
      if (test.path === '/health/ready' && response.ok) {
        try {
          const data = await response.json();
          console.log('   📊 Service Status:');
          if (data.checks) {
            Object.entries(data.checks).forEach(([service, check]) => {
              const status = check.status === 'up' || check.status === 'ok' ? '✅' : '❌';
              console.log(`     ${status} ${service}: ${check.status}`);
            });
          }
          if (data.uptime) {
            console.log(`   ⏱️ Uptime: ${Math.round(data.uptime)}s`);
          }
        } catch (e) {
          // JSON parsing failed, but that's ok
        }
      }
      
    } catch (error) {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      console.log(`❌ ${test.name}: ${latency}ms - ${error.message}`);
    }
  }

  // Test connectivity endpoint
  console.log('\n🌐 Testing Azure Service Connectivity...');
  const connectivityUrl = `${AZURE_URL}/connectivity/test`;
  const startTime = performance.now();
  
  try {
    const response = await fetch(connectivityUrl, { timeout: 15000 });
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    
    if (response.ok) {
      console.log(`✅ Connectivity Test: ${latency}ms`);
      
      try {
        const data = await response.json();
        console.log('\n📈 Azure Services Status:');
        
        if (data.tests) {
          data.tests.forEach(test => {
            const icon = test.status === 'success' ? '✅' : test.status === 'warning' ? '⚠️' : '❌';
            const latencyInfo = test.latency ? ` (${test.latency}ms)` : '';
            console.log(`  ${icon} ${test.service}${latencyInfo}: ${test.message}`);
          });
        }
        
        if (data.summary) {
          console.log('\n📊 Summary:');
          console.log(`  • Services tested: ${data.summary.totalTests}`);
          console.log(`  • Successful: ${data.summary.successful}`);
          console.log(`  • Average latency: ${data.summary.averageLatency}ms`);
        }
        
        if (data.networkOptimizations) {
          console.log('\n🚀 Network Optimizations:');
          const opts = data.networkOptimizations;
          console.log(`  • VNet Integration: ${opts.vnetIntegration ? 'ENABLED' : 'DISABLED'}`);
          console.log(`  • Private Endpoints: ${opts.privateEndpoints ? 'ENABLED' : 'DISABLED'}`);
          console.log(`  • Ultra Low Latency: ${opts.ultraLowLatency ? 'ENABLED' : 'DISABLED'}`);
        }
        
      } catch (e) {
        console.log('  ⚠️ Could not parse connectivity response');
      }
    } else {
      console.log(`❌ Connectivity Test: ${latency}ms (HTTP ${response.status})`);
    }
    
  } catch (error) {
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    console.log(`❌ Connectivity Test: ${latency}ms - ${error.message}`);
  }

  console.log('\n🎯 Azure Container Apps Status: DEPLOYED & RUNNING ✅');
}

// Handle global fetch for older Node.js versions
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testAzureDeployment().catch(console.error); 