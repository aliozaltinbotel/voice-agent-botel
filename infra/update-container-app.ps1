#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Update Container App with proper service endpoints and configuration
.DESCRIPTION
    This script updates the deployed Container App with all service endpoints,
    builds and deploys the media worker, and tests connectivity.
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory = $false)]
    [string]$ResourceGroupName = '',
    
    [Parameter(Mandatory = $false)]
    [string]$ContainerAppName = '',
    
    [Parameter(Mandatory = $false)]
    [string]$ImageName = 'ghcr.io/botel-ai/voice-agent-media-worker:latest'
)

# Color functions
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

# Main function
function Update-ContainerApp {
    Write-Header "Updating Container App with Service Endpoints"
    
    try {
        # Load deployment outputs
        $outputFile = "deployment-outputs-$Environment.json"
        if (-not (Test-Path $outputFile)) {
            throw "Deployment outputs file not found: $outputFile"
        }
        
        $outputs = Get-Content $outputFile | ConvertFrom-Json
        Write-Success "Loaded deployment outputs"
        
        # Extract values
        $rgName = if ($ResourceGroupName) { $ResourceGroupName } else { $outputs.resourceGroupName.value }
        $appName = if ($ContainerAppName) { $ContainerAppName } else { "ca-media-worker-$Environment" }
        
        Write-Info "Resource Group: $rgName"
        Write-Info "Container App: $appName"
        Write-Info "Image: $ImageName"
        
        Write-Header "Building and Pushing Container Image"
        
        # Navigate to media-worker directory
        Push-Location -Path "..\media-worker"
        
        try {
            # Build the container image
            Write-Info "Building container image..."
            docker build -t $ImageName .
            if ($LASTEXITCODE -ne 0) {
                throw "Docker build failed"
            }
            Write-Success "Container image built successfully"
            
            # Push to registry (assuming GitHub Container Registry)
            Write-Info "Pushing to container registry..."
            # Note: User needs to be logged in to ghcr.io
            # docker push $ImageName
            Write-Warning "Manual step: Push the image to your container registry"
            Write-Info "Run: docker push $ImageName"
            
        } finally {
            Pop-Location
        }
        
        Write-Header "Configuring Container App Environment Variables"
        
        # Create environment variables JSON
        $envVars = @(
            @{
                name = "NODE_ENV"
                value = $Environment
            },
            @{
                name = "PORT"
                value = "8080"
            },
            @{
                name = "VOICE_LIVE_ENABLED"
                value = "true"
            },
            @{
                name = "VOICE_LIVE_ENDPOINT"
                value = $outputs.voiceLiveEndpoint.value
            },
            @{
                name = "VOICE_LIVE_MODEL"
                value = $outputs.voiceLiveModel.value
            },
            @{
                name = "ACS_CONNECTION_STRING"
                secretRef = "acs-connection-string"
            },
            @{
                name = "SPEECH_ENDPOINT"
                value = $outputs.speechEndpoint.value
            },
            @{
                name = "SPEECH_KEY"
                secretRef = "speech-key"
            },
            @{
                name = "SPEECH_REGION"
                value = "eastus2"
            },
            @{
                name = "COSMOS_ENDPOINT"
                value = $outputs.cosmosEndpoint.value
            },
            @{
                name = "COSMOS_KEY"
                secretRef = "cosmos-key"
            },
            @{
                name = "COSMOS_DATABASE_NAME"
                value = "voice-agent-db"
            },
            @{
                name = "COSMOS_CONTAINER_NAME"
                value = "conversations"
            },
            @{
                name = "APPLICATIONINSIGHTS_CONNECTION_STRING"
                value = $outputs.appInsightsConnectionString.value
            },
            @{
                name = "KEY_VAULT_NAME"
                value = $outputs.keyVaultName.value
            },
            @{
                name = "AZURE_TENANT_ID"
                value = (az account show --query tenantId -o tsv)
            },
            @{
                name = "ENABLE_PRIVATE_ENDPOINTS"
                value = $outputs.privateEndpointsEnabled.value.ToString().ToLower()
            },
            @{
                name = "VNET_INTEGRATION"
                value = $outputs.ultraLowLatencyEnabled.value.ToString().ToLower()
            }
        )
        
        # Convert to JSON for Azure CLI
        $envVarsJson = $envVars | ConvertTo-Json -Compress
        
        Write-Header "Updating Container App Configuration"
        
        # Update the container app
        $updateCmd = @(
            'az', 'containerapp', 'update',
            '--name', $appName,
            '--resource-group', $rgName,
            '--image', $ImageName,
            '--set-env-vars', ($envVars | ForEach-Object { 
                if ($_.secretRef) { 
                    "$($_.name)=secretref:$($_.secretRef)" 
                } else { 
                    "$($_.name)=$($_.value)" 
                } 
            }) -join ' ',
            '--output', 'json'
        )
        
        Write-Info "Executing: az containerapp update..."
        $updateResult = & $updateCmd[0] $updateCmd[1..($updateCmd.Length-1)]
        
        if ($LASTEXITCODE -ne 0) {
            throw "Container App update failed"
        }
        
        Write-Success "Container App updated successfully"
        
        Write-Header "Testing Service Connectivity"
        
        # Test endpoints
        $containerAppUrl = "https://$($outputs.containerAppFqdn.value)"
        
        Write-Info "Testing health endpoints..."
        try {
            # Test health endpoint
            $healthResponse = Invoke-RestMethod -Uri "$containerAppUrl/health/live" -Method GET -TimeoutSec 30
            Write-Success "Health endpoint accessible: $($healthResponse | ConvertTo-Json -Compress)"
        } catch {
            Write-Warning "Health endpoint test failed: $($_.Exception.Message)"
        }
        
        try {
            # Test readiness endpoint
            $readyResponse = Invoke-RestMethod -Uri "$containerAppUrl/health/ready" -Method GET -TimeoutSec 30
            Write-Success "Readiness endpoint accessible: $($readyResponse | ConvertTo-Json -Compress)"
        } catch {
            Write-Warning "Readiness endpoint test failed: $($_.Exception.Message)"
        }
        
        Write-Header "Service Connectivity Summary"
        Write-Success "✅ Container App successfully updated and configured"
        Write-Info "📊 Service Endpoints:"
        Write-Host "   • Container App: $containerAppUrl" -ForegroundColor White
        Write-Host "   • Voice Live API: $($outputs.voiceLiveEndpoint.value)" -ForegroundColor White
        Write-Host "   • Speech Service: $($outputs.speechEndpoint.value)" -ForegroundColor White
        Write-Host "   • Cosmos DB: $($outputs.cosmosEndpoint.value)" -ForegroundColor White
        Write-Host "   • Key Vault: https://$($outputs.keyVaultName.value).vault.azure.net/" -ForegroundColor White
        
        Write-Header "Network Optimizations Active"
        if ($outputs.ultraLowLatencyEnabled.value) {
            Write-Success "🚀 Ultra-Low Latency Features:"
            Write-Host "   • VNet Integration: $($outputs.vnetName.value)" -ForegroundColor Green
            if ($outputs.privateEndpointsEnabled.value) {
                Write-Host "   • Private Endpoints: Enabled" -ForegroundColor Green
            }
            Write-Host "   • Expected latency reduction: 40-95ms" -ForegroundColor Green
        }
        
        Write-Header "Next Steps"
        Write-Info "1. Configure phone number in Azure Communication Services"
        Write-Info "2. Test voice calls end-to-end"
        Write-Info "3. Monitor performance metrics in Application Insights"
        Write-Info "4. Scale Container App based on usage patterns"
        
        return @{
            ContainerAppUrl = $containerAppUrl
            Endpoints = @{
                VoiceLive = $outputs.voiceLiveEndpoint.value
                Speech = $outputs.speechEndpoint.value
                Cosmos = $outputs.cosmosEndpoint.value
                KeyVault = "https://$($outputs.keyVaultName.value).vault.azure.net/"
            }
        }
        
    } catch {
        Write-Error "Update failed: $($_.Exception.Message)"
        exit 1
    }
}

# Run the update
Update-ContainerApp 