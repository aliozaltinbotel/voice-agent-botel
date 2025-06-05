# Botel AI Voice Agent Infrastructure Deployment Script
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus2",
    
    [Parameter(Mandatory=$false)]
    [string]$BaseName = "botel-voice",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "",
    
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host @"
Usage: .\deploy.ps1 [OPTIONS]
Options:
  -Environment     Environment (dev/test/prod) - default: dev
  -Location        Azure region - default: eastus2
  -BaseName        Base name for resources - default: botel-voice
  -SubscriptionId  Azure subscription ID
  -Help            Show this help message

Example:
  .\deploy.ps1 -Environment prod -Location eastus2
"@
    exit 0
}

# Check for Azure region environment variable
if ($env:AZURE_REGION) {
    $Location = $env:AZURE_REGION
}

Write-Host "🚀 Starting Botel AI Voice Agent Infrastructure Deployment" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "Base Name: $BaseName" -ForegroundColor Yellow

# Check if logged in to Azure
try {
    $account = az account show | ConvertFrom-Json
} catch {
    Write-Host "❌ Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
    az account set --subscription $SubscriptionId
}

# Get current subscription
$currentSub = az account show --query name -o tsv
Write-Host "Using subscription: $currentSub" -ForegroundColor Yellow

# Create deployment name
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$deploymentName = "botel-voice-$Environment-$timestamp"

# Deploy the infrastructure
Write-Host "📦 Deploying infrastructure..." -ForegroundColor Green
$deploymentResult = az deployment sub create `
    --name $deploymentName `
    --location $Location `
    --template-file main.bicep `
    --parameters `
        location=$Location `
        environment=$Environment `
        baseName=$BaseName `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    
    # Get outputs
    Write-Host "`n📋 Deployment Outputs:" -ForegroundColor Green
    $outputs = az deployment sub show `
        --name $deploymentName `
        --query properties.outputs `
        --output json | ConvertFrom-Json
    
    $outputs | ConvertTo-Json -Depth 10 | Write-Host
    
    # Save outputs to file
    $outputFile = "deployment-outputs-$Environment.json"
    $outputs | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host "`n💾 Outputs saved to: $outputFile" -ForegroundColor Green
    
    # Extract important values
    $rgName = $outputs.resourceGroupName.value
    $kvName = $outputs.keyVaultName.value
    $appUrl = $outputs.containerAppUrl.value
    
    Write-Host "`n🎯 Quick Access Info:" -ForegroundColor Green
    Write-Host "Resource Group: $rgName" -ForegroundColor Yellow
    Write-Host "Key Vault: $kvName" -ForegroundColor Yellow
    Write-Host "Media Worker URL: https://$appUrl" -ForegroundColor Yellow
    
    # Verify secrets were stored in Key Vault
    Write-Host "`n🔐 Verifying secrets in Key Vault..." -ForegroundColor Green
    
    $secrets = @(
        "acs-connection-string",
        "speech-key",
        "cosmos-key",
        "agent-system-prompt"
    )
    
    $secretsStored = $true
    foreach ($secretName in $secrets) {
        try {
            $secret = az keyvault secret show `
                --vault-name $kvName `
                --name $secretName `
                --query "name" -o tsv 2>$null
            
            if ($secret) {
                Write-Host "✅ Secret '$secretName' is stored in Key Vault" -ForegroundColor Green
            } else {
                Write-Host "❌ Secret '$secretName' not found in Key Vault" -ForegroundColor Red
                $secretsStored = $false
            }
        } catch {
            Write-Host "❌ Failed to check secret '$secretName'" -ForegroundColor Red
            $secretsStored = $false
        }
    }
    
    if ($secretsStored) {
        Write-Host "`n✅ All secrets successfully stored in Key Vault!" -ForegroundColor Green
        Write-Host "No manual configuration needed - everything is automated! 🎉" -ForegroundColor Cyan
    }
    
    # Show how to retrieve secrets if needed
    Write-Host "`n📌 To retrieve secrets (if needed):" -ForegroundColor Yellow
    Write-Host "az keyvault secret show --vault-name $kvName --name acs-connection-string --query value -o tsv"
    Write-Host "az keyvault secret show --vault-name $kvName --name speech-key --query value -o tsv"
    Write-Host "az keyvault secret show --vault-name $kvName --name cosmos-key --query value -o tsv"
    
    Write-Host "`n📝 Next Steps:" -ForegroundColor Green
    Write-Host "1. Build and push the media worker container image"
    Write-Host "2. The container app will automatically use the secrets from Key Vault"
    Write-Host "3. Configure phone numbers in Azure Communication Services"
    Write-Host "4. Test the voice agent at: https://$appUrl"
    
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
} 