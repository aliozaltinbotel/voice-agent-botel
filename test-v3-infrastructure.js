#!/usr/bin/env node

const https = require('https');

// New v3 infrastructure endpoints
const V3_CONTAINER_APP_URL = 'https://ca-media-worker-dev.victorioustree-4c25e022.eastus2.azurecontainerapps.io';

async function makeRequest(url, timeout = 10000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const req = https.get(url, { timeout }, (res) => {
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    latency,
                    data: data.substring(0, 200),
                    headers: res.headers
                });
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            const endTime = Date.now();
            resolve({
                status: 'TIMEOUT',
                latency: endTime - startTime,
                error: 'Request timeout'
            });
        });
        
        req.on('error', (err) => {
            const endTime = Date.now();
            resolve({
                status: 'ERROR',
                latency: endTime - startTime,
                error: err.message
            });
        });
    });
}

async function testEndpoint(name, url) {
    console.log(`🔍 Testing ${name}...`);
    const result = await makeRequest(url);
    
    const statusIcon = result.status === 200 ? '✅' : 
                      result.status === 404 ? '⚠️' : 
                      result.status === 'TIMEOUT' ? '⏰' : '❌';
    
    console.log(`${statusIcon} ${name}: ${result.latency}ms (HTTP ${result.status})`);
    
    if (result.error) {
        console.log(`   Error: ${result.error}`);
    }
    
    return result;
}

async function main() {
    console.log('🚀 Testing Fresh V3 Infrastructure...');
    console.log('🔗 URL:', V3_CONTAINER_APP_URL);
    console.log('📅 Time:', new Date().toISOString());
    console.log('');
    
    // Test health endpoints
    const healthLive = await testEndpoint('Health Live', `${V3_CONTAINER_APP_URL}/health/live`);
    const healthReady = await testEndpoint('Health Ready', `${V3_CONTAINER_APP_URL}/health/ready`);
    const healthStartup = await testEndpoint('Health Startup', `${V3_CONTAINER_APP_URL}/health/startup`);
    
    console.log('');
    console.log('🌐 Testing API Endpoints...');
    const apiDocs = await testEndpoint('API Docs', `${V3_CONTAINER_APP_URL}/api`);
    const connectivity = await testEndpoint('Connectivity Test', `${V3_CONTAINER_APP_URL}/connectivity/test`);
    
    console.log('');
    console.log('🎯 V3 Infrastructure Status Analysis:');
    
    if (healthLive.status === 'ERROR' || healthLive.status === 'TIMEOUT') {
        console.log('❌ Container App: NOT DEPLOYED or NOT RUNNING');
        console.log('   The container app is not responding to requests');
        console.log('   This is expected if GitHub Actions deployment is still in progress');
    } else if (healthLive.status === 404) {
        console.log('⚠️  Container App: DEPLOYED but APPLICATION NOT RUNNING');
        console.log('   The container is responding but the NestJS app is not started');
        console.log('   Check container logs for startup issues');
    } else if (healthLive.status === 200) {
        console.log('✅ Container App: FULLY OPERATIONAL');
        console.log('   The NestJS application is running and healthy');
    } else {
        console.log(`⚠️  Container App: UNKNOWN STATUS (HTTP ${healthLive.status})`);
    }
    
    // Calculate average latency
    const validLatencies = [healthLive, healthReady, healthStartup, apiDocs, connectivity]
        .filter(r => typeof r.latency === 'number')
        .map(r => r.latency);
    
    if (validLatencies.length > 0) {
        const avgLatency = Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length);
        console.log(`📊 Average Latency: ${avgLatency}ms`);
        
        if (avgLatency < 500) {
            console.log('🚀 EXCELLENT: Ultra-low latency achieved!');
        } else if (avgLatency < 1000) {
            console.log('✅ GOOD: Low latency performance');
        } else {
            console.log('⚠️  HIGH: Latency above target (>1000ms)');
        }
    }
    
    console.log('');
    console.log('🔄 Next Steps:');
    if (healthLive.status === 'ERROR' || healthLive.status === 'TIMEOUT') {
        console.log('1. Wait for GitHub Actions deployment to complete');
        console.log('2. Check GitHub Actions logs for deployment status');
        console.log('3. Re-run this test after deployment finishes');
    } else if (healthLive.status === 404) {
        console.log('1. Check Azure Container Apps logs for application startup errors');
        console.log('2. Verify environment variables are correctly set');
        console.log('3. Check if the container command is correctly configured');
    } else {
        console.log('1. Run comprehensive API tests');
        console.log('2. Test voice processing endpoints');
        console.log('3. Monitor performance under load');
    }
}

main().catch(console.error); 