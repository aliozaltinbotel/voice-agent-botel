# Setup GitHub CI/CD with Azure Service Principal
# This script creates an Azure Service Principal and provides the credentials for GitHub Actions

param(
    [Parameter(Mandatory = $false)]
    [string]$ServicePrincipalName = "sp-github-actions-botel-voice",
    
    [Parameter(Mandatory = $false)]
    [string]$ResourceGroupName = "rg-botel-voice-v2-dev",
    
    [Parameter(Mandatory = $false)]
    [string]$SubscriptionId = "25e4a027-53b5-408e-bf95-adce3c4aa503"
)

Write-Host "🚀 Setting up GitHub Actions CI/CD for Botel Voice Agent" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Get current subscription
$currentSub = az account show --query id -o tsv
if ($currentSub -ne $SubscriptionId) {
    Write-Host "⚠️  Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
    az account set --subscription $SubscriptionId
}

# Get resource group scope
$scope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName"

Write-Host "ℹ️  Creating Service Principal: $ServicePrincipalName" -ForegroundColor Blue
Write-Host "ℹ️  Scope: $scope" -ForegroundColor Blue

# Create service principal with contributor role on the resource group
$spOutput = az ad sp create-for-rbac `
    --name $ServicePrincipalName `
    --role "Contributor" `
    --scopes $scope `
    --sdk-auth

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create service principal" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Service Principal created successfully!" -ForegroundColor Green

Write-Host "`n📋 GitHub Repository Secrets Setup" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor Cyan

Write-Host "`n1. Go to your GitHub repository: https://github.com/aliozaltinbotel/voice-agent-botel" -ForegroundColor White
Write-Host "2. Navigate to Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host "3. Create a new repository secret named: AZURE_CREDENTIALS" -ForegroundColor White
Write-Host "4. Copy and paste the following JSON as the secret value:" -ForegroundColor White

Write-Host "`n" -ForegroundColor White
Write-Host "AZURE_CREDENTIALS:" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow
Write-Host $spOutput -ForegroundColor Green

Write-Host "`n🔄 Next Steps:" -ForegroundColor Cyan
Write-Host "=" * 15 -ForegroundColor Cyan
Write-Host "1. Add the AZURE_CREDENTIALS secret to GitHub as shown above" -ForegroundColor White
Write-Host "2. Push any changes to trigger the GitHub Actions workflow" -ForegroundColor White
Write-Host "3. The workflow will automatically build and deploy your container app" -ForegroundColor White

Write-Host "`n✨ Once setup is complete, every commit to main/master will trigger deployment!" -ForegroundColor Green 