# Fix Container App Startup Command
# This script removes the incorrect startup command override

Write-Host "🔧 Fixing Container App Startup Command..." -ForegroundColor Cyan

$resourceGroup = "rg-botel-voice-v2-dev"
$containerApp = "ca-media-worker-dev"

# Get current configuration
Write-Host "📋 Getting current configuration..." -ForegroundColor Yellow
$currentConfig = az containerapp show --name $containerApp --resource-group $resourceGroup --query "properties.template" -o json | ConvertFrom-Json

# Remove the problematic command and args
Write-Host "🗑️ Removing incorrect startup command..." -ForegroundColor Yellow
$currentConfig.containers[0].PSObject.Properties.Remove('command')
$currentConfig.containers[0].PSObject.Properties.Remove('args')

# Save the fixed configuration to a temporary file
$tempFile = "temp-container-config.json"
$currentConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "💾 Saved fixed configuration to $tempFile" -ForegroundColor Green

# Apply the fixed configuration
Write-Host "🚀 Applying fixed configuration..." -ForegroundColor Yellow

try {
    # Update using the template file
    az containerapp update --name $containerApp --resource-group $resourceGroup --yaml $tempFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Container App updated successfully!" -ForegroundColor Green
        Write-Host "⏳ Waiting for deployment to complete..." -ForegroundColor Yellow
        
        # Wait a bit for the deployment
        Start-Sleep -Seconds 30
        
        # Test the endpoint
        Write-Host "🧪 Testing the endpoint..." -ForegroundColor Yellow
        $testUrl = "https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/health/live"
        
        try {
            $response = Invoke-WebRequest -Uri $testUrl -TimeoutSec 10
            Write-Host "✅ Health endpoint responding: HTTP $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Health endpoint not yet responding: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "💡 This is normal - container may still be starting up" -ForegroundColor Blue
        }
        
    } else {
        Write-Host "❌ Failed to update Container App" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile
        Write-Host "🗑️ Cleaned up temporary file" -ForegroundColor Gray
    }
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Wait 2-3 minutes for the container to fully start" -ForegroundColor White
Write-Host "2. Test the endpoint: https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/health/live" -ForegroundColor White
Write-Host "3. Check logs if still not working: az containerapp logs show --name $containerApp --resource-group $resourceGroup" -ForegroundColor White 