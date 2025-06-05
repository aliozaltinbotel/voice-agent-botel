#!/usr/bin/env pwsh

# Update GitHub Repository Secrets for Fresh Deployment
# Run this script after authenticating with: gh auth login

Write-Host "🔑 Updating GitHub Repository Secrets..." -ForegroundColor Cyan
Write-Host "=" * 50

# Ensure GitHub CLI is in PATH
$env:PATH += ";${env:ProgramFiles}\GitHub CLI"

# Check if authenticated
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not authenticated with GitHub CLI" -ForegroundColor Red
        Write-Host "Please run: gh auth login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ GitHub CLI authenticated" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub CLI not available or not authenticated" -ForegroundColor Red
    Write-Host "Please install and authenticate: gh auth login" -ForegroundColor Yellow
    exit 1
}

# Define the secrets to update
$secrets = @{
    "AZURE_RESOURCE_GROUP" = "rg-botel-voice-v3-dev"
    "AZURE_CONTAINER_APP" = "ca-media-worker-dev"
    "AZURE_CONTAINER_APP_ENVIRONMENT" = "cae-botel-voice-v3-dev"
    "SPEECH_ENDPOINT" = "https://speech-botel-voice-v3-dev.cognitiveservices.azure.com/"
    "COSMOS_ENDPOINT" = "https://cosmos-botel-voice-v3-dev.documents.azure.com:443/"
    "KEY_VAULT_NAME" = "kv-botelvoi-dev-x466l3"
    "VOICE_LIVE_ENDPOINT" = "wss://eastus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1"
    "VOICE_LIVE_MODEL" = "gpt-4o-realtime-preview"
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = "InstrumentationKey=bd0a819b-6ec3-4ee8-8b5a-6235c02a400f;IngestionEndpoint=https://eastus2-3.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus2.livediagnostics.monitor.azure.com/;ApplicationId=8f82a401-e87c-4345-840f-1f4156a97070"
    "ACS_CONNECTION_STRING" = "endpoint=https://acs-botel-voice-v3-dev.unitedstates.communication.azure.com/;accesskey=4u0GvFJEZo0GvfZst0ovPo8h44uNEeSMWvPuDYCQpATnz9e53dD3JQQJ99BFACULyCpL67kMAAAAAZCS2xv0"
}

Write-Host "🚀 Updating $($secrets.Count) repository secrets..." -ForegroundColor Yellow

$successCount = 0
$errorCount = 0

foreach ($secretName in $secrets.Keys) {
    $secretValue = $secrets[$secretName]
    
    Write-Host "📝 Updating: $secretName" -ForegroundColor Cyan
    
    try {
        $result = gh secret set $secretName --body $secretValue 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Success" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ❌ Failed: $result" -ForegroundColor Red
            $errorCount++
        }
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "🎯 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Successfully updated: $successCount secrets" -ForegroundColor Green
Write-Host "  ❌ Failed to update: $errorCount secrets" -ForegroundColor Red

if ($errorCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 All secrets updated successfully!" -ForegroundColor Green
    Write-Host "🚀 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Push code to trigger GitHub Actions deployment" -ForegroundColor Yellow
    Write-Host "  2. Monitor deployment at: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/actions" -ForegroundColor Yellow
    Write-Host "  3. Test endpoints at: https://ca-media-worker-dev.victorioustree-4c25e022.eastus2.azurecontainerapps.io" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "⚠️  Some secrets failed to update. Please check the errors above." -ForegroundColor Yellow
    Write-Host "You may need to update them manually in GitHub Settings." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 50 