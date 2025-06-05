# Azure Container Apps Diagnostic Script
# This script will help diagnose issues with the media worker deployment

Write-Host "🔍 Azure Container Apps Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$resourceGroup = "rg-botel-voice-v2-dev"
$containerApp = "ca-media-worker-dev"

Write-Host "`n1. 📋 Checking Container App Status..." -ForegroundColor Yellow

# Check if logged in to Azure
try {
    $account = az account show --query "name" -o tsv 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not logged in to Azure. Please run: az login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Logged in as: $account" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found or not logged in" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. 🏗️ Container App Overview..." -ForegroundColor Yellow
az containerapp show --name $containerApp --resource-group $resourceGroup --query "{name:name,status:properties.provisioningState,fqdn:properties.configuration.ingress.fqdn,replicas:properties.template.scale.minReplicas}" -o table

Write-Host "`n3. 🔄 Current Revision Status..." -ForegroundColor Yellow
az containerapp revision list --name $containerApp --resource-group $resourceGroup --query "[].{name:name,active:properties.active,createdTime:properties.createdTime,provisioningState:properties.provisioningState}" -o table

Write-Host "`n4. 🖥️ Container Configuration..." -ForegroundColor Yellow
az containerapp show --name $containerApp --resource-group $resourceGroup --query "properties.template.containers[0].{image:image,cpu:resources.cpu,memory:resources.memory}" -o table

Write-Host "`n5. 🌐 Ingress Configuration..." -ForegroundColor Yellow
az containerapp show --name $containerApp --resource-group $resourceGroup --query "properties.configuration.ingress.{external:external,targetPort:targetPort,transport:transport}" -o table

Write-Host "`n6. 📊 Replica Status..." -ForegroundColor Yellow
az containerapp replica list --name $containerApp --resource-group $resourceGroup --query "[].{name:name,createdTime:properties.createdTime,runningState:properties.runningState}" -o table

Write-Host "`n7. 🔍 Recent Container Logs (Last 50 lines)..." -ForegroundColor Yellow
Write-Host "Fetching logs..." -ForegroundColor Gray
az containerapp logs show --name $containerApp --resource-group $resourceGroup --tail 50

Write-Host "`n8. ⚠️ Checking for Errors in Logs..." -ForegroundColor Yellow
Write-Host "Searching for error patterns..." -ForegroundColor Gray
$errorLogs = az containerapp logs show --name $containerApp --resource-group $resourceGroup --tail 100 | Select-String -Pattern "error|Error|ERROR|fail|Fail|FAIL|exception|Exception"
if ($errorLogs) {
    Write-Host "❌ Found potential errors:" -ForegroundColor Red
    $errorLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
} else {
    Write-Host "✅ No obvious errors found in recent logs" -ForegroundColor Green
}

Write-Host "`n9. 🚀 Environment Variables..." -ForegroundColor Yellow
az containerapp show --name $containerApp --resource-group $resourceGroup --query "properties.template.containers[0].env[].{name:name,value:value}" -o table

Write-Host "`n10. 🔧 Health Probe Configuration..." -ForegroundColor Yellow
$healthProbes = az containerapp show --name $containerApp --resource-group $resourceGroup --query "properties.template.containers[0].probes" -o json | ConvertFrom-Json
if ($healthProbes) {
    Write-Host "Health probes configured:" -ForegroundColor Green
    $healthProbes | ConvertTo-Json -Depth 3
} else {
    Write-Host "⚠️ No health probes configured" -ForegroundColor Yellow
}

Write-Host "`n11. 📈 Container App Events..." -ForegroundColor Yellow
Write-Host "Checking recent events..." -ForegroundColor Gray
az containerapp revision list --name $containerApp --resource-group $resourceGroup --query "[0].properties.template.containers[0]" -o json

Write-Host "`n12. 🌍 Testing External Connectivity..." -ForegroundColor Yellow
$fqdn = az containerapp show --name $containerApp --resource-group $resourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
if ($fqdn) {
    Write-Host "Testing HTTPS endpoint: https://$fqdn/health/live" -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "https://$fqdn/health/live" -TimeoutSec 10 -ErrorAction Stop
        Write-Host "✅ Health endpoint responding: HTTP $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Health endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "   HTTP Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ No FQDN found - ingress might not be configured" -ForegroundColor Red
}

Write-Host "`n13. 🔄 Container Restart History..." -ForegroundColor Yellow
$revisions = az containerapp revision list --name $containerApp --resource-group $resourceGroup --query "[].{name:name,createdTime:properties.createdTime,active:properties.active}" -o json | ConvertFrom-Json
Write-Host "Recent revisions:" -ForegroundColor Gray
$revisions | Format-Table -AutoSize

Write-Host "`n📋 DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

# Summary checks
$appStatus = az containerapp show --name $containerApp --resource-group $resourceGroup --query "properties.provisioningState" -o tsv
$activeRevision = az containerapp revision list --name $containerApp --resource-group $resourceGroup --query "[?properties.active].name" -o tsv

Write-Host "Container App Status: $appStatus" -ForegroundColor $(if ($appStatus -eq "Succeeded") { "Green" } else { "Red" })
Write-Host "Active Revision: $activeRevision" -ForegroundColor $(if ($activeRevision) { "Green" } else { "Red" })
Write-Host "External URL: https://$fqdn" -ForegroundColor Gray

Write-Host "`n🔧 RECOMMENDED ACTIONS:" -ForegroundColor Yellow
Write-Host "1. Check the container logs above for any startup errors" -ForegroundColor White
Write-Host "2. Verify the application is listening on the correct port (8080)" -ForegroundColor White
Write-Host "3. Ensure all required environment variables are set" -ForegroundColor White
Write-Host "4. Check if the Docker image was built and pushed successfully" -ForegroundColor White

Write-Host "`n✅ Diagnostic complete!" -ForegroundColor Green 