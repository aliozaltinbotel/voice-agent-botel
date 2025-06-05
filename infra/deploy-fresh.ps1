#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Fresh deployment of Botel Voice Agent infrastructure with new resource names
.DESCRIPTION
    This script deploys a completely new infrastructure with updated resource names
    to avoid conflicts with previously deleted resources.
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory = $false)]
    [string]$Location = 'eastus2',
    
    [Parameter(Mandatory = $false)]
    [string]$BaseName = 'botel-voice-v3',  # Updated base name
    
    [Parameter(Mandatory = $false)]
    [bool]$EnableUltraLowLatency = $true,
    
    [Parameter(Mandatory = $false)]
    [bool]$EnablePrivateEndpoints = $true
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

# Main deployment function
function Deploy-FreshInfrastructure {
    Write-Header "Fresh Botel Voice Agent Infrastructure Deployment"
    
    Write-Info "Configuration:"
    Write-Info "  Environment: $Environment"
    Write-Info "  Location: $Location"
    Write-Info "  Base Name: $BaseName"
    Write-Info "  Ultra Low Latency: $EnableUltraLowLatency"
    Write-Info "  Private Endpoints: $EnablePrivateEndpoints"
    
    try {
        # Check Azure CLI login
        Write-Header "Checking Azure CLI Authentication"
        $account = az account show --query "name" -o tsv 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Not logged in to Azure. Please run: az login"
            return $false
        }
        Write-Success "Logged in as: $account"
        
        # Generate unique deployment name
        $deploymentName = "botel-voice-fresh-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $resourceGroupName = "rg-$BaseName-$Environment"
        
        Write-Header "Deploying Infrastructure"
        Write-Info "Deployment Name: $deploymentName"
        Write-Info "Resource Group: $resourceGroupName"
        
        # Deploy the Bicep template
        $deploymentResult = az deployment sub create `
            --name $deploymentName `
            --location $Location `
            --template-file "main.bicep" `
            --parameters `
                environment=$Environment `
                location=$Location `
                baseName=$BaseName `
                enableUltraLowLatency=$EnableUltraLowLatency `
                enablePrivateEndpoints=$EnablePrivateEndpoints `
            --output json
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Infrastructure deployment failed"
            return $false
        }
        
        Write-Success "Infrastructure deployed successfully"
        
        # Parse deployment outputs
        $outputs = $deploymentResult | ConvertFrom-Json
        $outputFile = "deployment-outputs-$Environment-fresh.json"
        $outputs.properties.outputs | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Success "Deployment outputs saved to: $outputFile"
        
        Write-Header "Deployment Summary"
        Write-Success "Resource Group: $($outputs.properties.outputs.resourceGroupName.value)"
        Write-Success "Container App Environment: $($outputs.properties.outputs.containerAppsEnvironmentName.value)"
        Write-Success "Key Vault: $($outputs.properties.outputs.keyVaultName.value)"
        Write-Success "Speech Service: $($outputs.properties.outputs.speechServiceName.value)"
        Write-Success "Cosmos DB: $($outputs.properties.outputs.cosmosAccountName.value)"
        
        if ($outputs.properties.outputs.containerAppUrl) {
            Write-Success "Container App URL: $($outputs.properties.outputs.containerAppUrl.value)"
        }
        
        Write-Header "Next Steps"
        Write-Info "1. Update GitHub repository secrets with new resource names"
        Write-Info "2. Push code to trigger GitHub Actions deployment"
        Write-Info "3. Test the media worker endpoints"
        
        Write-Warning "Important: Update these GitHub secrets:"
        Write-Host "   AZURE_RESOURCE_GROUP: $resourceGroupName" -ForegroundColor Yellow
        Write-Host "   AZURE_CONTAINER_APP: ca-media-worker-$Environment" -ForegroundColor Yellow
        
        return $true
        
    } catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        return $false
    }
}

# Execute deployment
$success = Deploy-FreshInfrastructure

if ($success) {
    Write-Header "🎉 Fresh Infrastructure Deployment Complete!"
    Write-Success "Your new Botel Voice Agent infrastructure is ready"
    Write-Info "Next: Deploy the media worker application"
} else {
    Write-Header "❌ Deployment Failed"
    Write-Error "Please check the errors above and try again"
    exit 1
} 