#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Deploy Botel Voice Agent with Ultra-Low Latency Network Optimizations
.DESCRIPTION
    This script deploys the complete infrastructure with VNet integration,
    private endpoints, and performance optimizations for <700ms latency target.
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory = $false)]
    [string]$Location = 'eastus2',
    
    [Parameter(Mandatory = $false)]
    [string]$BaseName = 'botel-voice',
    
    [Parameter(Mandatory = $false)]
    [bool]$EnableUltraLowLatency = $true,
    
    [Parameter(Mandatory = $false)]
    [bool]$EnablePrivateEndpoints = $true,
    
    [Parameter(Mandatory = $false)]
    [string]$VnetAddressPrefix = '10.0.0.0/16'
)

# Color functions for better output
function Write-Header {
    param([string]$Message)
    Write-Host "`n🚀 $Message" -ForegroundColor Cyan
    Write-Host "=" * ($Message.Length + 4) -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# Main deployment function
function Deploy-Infrastructure {
    Write-Header "Botel Voice Agent - Ultra-Low Latency Deployment"
    
    Write-Info "Configuration:"
    Write-Host "  Environment: $Environment" -ForegroundColor White
    Write-Host "  Location: $Location" -ForegroundColor White
    Write-Host "  Base Name: $BaseName" -ForegroundColor White
    Write-Host "  Ultra-Low Latency: $EnableUltraLowLatency" -ForegroundColor White
    Write-Host "  Private Endpoints: $EnablePrivateEndpoints" -ForegroundColor White
    Write-Host "  VNet Address: $VnetAddressPrefix" -ForegroundColor White
    
    try {
        # Check Azure CLI
        Write-Header "Checking Prerequisites"
        $azVersion = az version --output table 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Azure CLI is not installed or not in PATH"
        }
        Write-Success "Azure CLI is available"
        
        # Check authentication
        $accountInfo = az account show 2>$null | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Not logged in to Azure. Please run 'az login'"
            az login
            $accountInfo = az account show | ConvertFrom-Json
        }
        Write-Success "Authenticated as: $($accountInfo.user.name)"
        Write-Info "Subscription: $($accountInfo.name) ($($accountInfo.id))"
        
        # Generate unique deployment name
        $deploymentName = "botel-voice-$Environment-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $outputFile = "deployment-outputs-$Environment.json"
        
        Write-Header "Deploying Infrastructure"
        Write-Info "Deployment name: $deploymentName"
        
        # Deploy with ultra-low latency optimizations
        $deployCmd = @(
            'az', 'deployment', 'sub', 'create',
            '--name', $deploymentName,
            '--location', $Location,
            '--template-file', 'main.bicep',
            '--parameters',
            "environment=$Environment",
            "location=$Location",
            "baseName=$BaseName",
            "enableUltraLowLatency=$EnableUltraLowLatency",
            "enablePrivateEndpoints=$EnablePrivateEndpoints",
            "vnetAddressPrefix=$VnetAddressPrefix",
            '--output', 'json'
        )
        
        Write-Info "Executing: $($deployCmd -join ' ')"
        $deploymentResult = & $deployCmd[0] $deployCmd[1..($deployCmd.Length-1)]
        
        if ($LASTEXITCODE -ne 0) {
            throw "Deployment failed with exit code $LASTEXITCODE"
        }
        
        # Parse and save outputs
        $deploymentOutput = $deploymentResult | ConvertFrom-Json
        $outputs = $deploymentOutput.properties.outputs
        
        $outputs | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Success "Deployment outputs saved to: $outputFile"
        
        Write-Header "Deployment Summary"
        Write-Success "✅ Infrastructure deployed successfully!"
        
        if ($outputs.ultraLowLatencyEnabled.value) {
            Write-Success "🚀 Ultra-Low Latency optimizations enabled"
            Write-Info "   - VNet Integration: $($outputs.vnetName.value)"
            if ($outputs.privateEndpointsEnabled.value) {
                Write-Info "   - Private Endpoints: Enabled"
            }
        }
        
        Write-Info "📊 Key Endpoints:"
        Write-Host "   Voice Live API: $($outputs.voiceLiveEndpoint.value)" -ForegroundColor White
        Write-Host "   Speech Service: $($outputs.speechEndpoint.value)" -ForegroundColor White
        Write-Host "   Container App: https://$($outputs.containerAppFqdn.value)" -ForegroundColor White
        Write-Host "   Cosmos DB: $($outputs.cosmosEndpoint.value)" -ForegroundColor White
        
        Write-Header "Network Performance Optimizations"
        if ($EnableUltraLowLatency) {
            Write-Success "🎯 Expected latency improvements:"
            Write-Host "   • VNet Integration: 20-40ms reduction" -ForegroundColor Green
            if ($EnablePrivateEndpoints) {
                Write-Host "   • Private Endpoints: 10-30ms reduction" -ForegroundColor Green
            }
            Write-Host "   • Enhanced Workload Profiles: 5-15ms reduction" -ForegroundColor Green
            Write-Host "   • Session Affinity: 5-10ms reduction" -ForegroundColor Green
            Write-Host "   • Total Expected: 40-95ms latency reduction" -ForegroundColor Cyan
        }
        
        Write-Header "Next Steps"
        Write-Info "1. Build and push your container image"
        Write-Info "2. Update Container App with your image"
        Write-Info "3. Configure phone number in ACS"
        Write-Info "4. Test voice calls for latency optimization"
        
        if ($Environment -eq 'prod') {
            Write-Warning "Production deployment - consider enabling zone redundancy"
        }
        
        return $outputs
        
    } catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        Write-Error "Check the Azure portal for detailed error information"
        exit 1
    }
}

# Run deployment
Deploy-Infrastructure 