# 🎯 Deployment Information - Botel Voice AI Agent

## 🔗 Important URLs & Endpoints

| Service | Value |
|---------|-------|
| **Resource Group** | `rg-botel-voice-dev` |
| **Key Vault** | `kv-botel-voice-dev-bxmc` |
| **Container App URL** | `https://ca-media-worker-dev.wittyisland-e788fb35.eastus2.azurecontainerapps.io` |
| **Voice Live Endpoint** | `wss://eastus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1` |
| **Speech Endpoint** | `https://speech-botel-voice-dev.cognitiveservices.azure.com/` |
| **Cosmos DB Endpoint** | `https://cosmos-botel-voice-dev.documents.azure.com:443/` |

## 🔑 Getting Secrets (when permissions propagate)

```bash
# ACS Connection String (for phone numbers)
az keyvault secret show --vault-name kv-botel-voice-dev-bxmc --name acs-connection-string --query value -o tsv

# Speech Key (for Voice Live API)
az keyvault secret show --vault-name kv-botel-voice-dev-bxmc --name speech-key --query value -o tsv

# Cosmos Key (for database)
az keyvault secret show --vault-name kv-botel-voice-dev-bxmc --name cosmos-key --query value -o tsv
```

## 📱 Application Insights

**Connection String:**
```
InstrumentationKey=df84076a-3fb1-49ae-bcb8-64888116be3f;IngestionEndpoint=https://eastus2-3.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus2.livediagnostics.monitor.azure.com/;ApplicationId=5c2400be-822b-46ae-9862-c863c36e1962
```

## 🚀 Quick Commands

```bash
# View Container App logs
az containerapp logs show --name ca-media-worker-dev --resource-group rg-botel-voice-dev --follow

# Update Container App image
az containerapp update --name ca-media-worker-dev --resource-group rg-botel-voice-dev --image YOUR_IMAGE

# List phone numbers
az communication phonenumber list --connection-string "YOUR_ACS_CONNECTION_STRING"

# Check deployment status
az deployment group list --resource-group rg-botel-voice-dev --query "[].{name:name, state:properties.provisioningState}" -o table
```

## 📋 Environment Variables for Media Worker

The Container App already has these configured:
- `VOICE_LIVE_ENABLED=true`
- `VOICE_LIVE_ENDPOINT=wss://eastus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1`
- `VOICE_LIVE_MODEL=gpt-4o-realtime-preview`
- `ACS_CONNECTION_STRING` (from Key Vault)
- `SPEECH_KEY` (from Key Vault)
- `SPEECH_REGION=eastus2`
- `COSMOS_ENDPOINT=https://cosmos-botel-voice-dev.documents.azure.com:443/`
- `COSMOS_KEY` (from Key Vault)
- `APPLICATIONINSIGHTS_CONNECTION_STRING`

## 🎯 Next Immediate Actions

1. **Wait 5-10 minutes** for Key Vault permissions to propagate
2. **Start building** the media worker application (see [Next Steps Guide](docs/next-steps-voice-agent.md))
3. **Purchase a phone number** using ACS connection string
4. **Test Voice Live connection** with a simple WebSocket client

---

**Everything is ready!** Your infrastructure is deployed and waiting for the media worker application. 