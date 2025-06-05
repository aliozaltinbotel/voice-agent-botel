# Update GitHub Repository Secrets

## Required Secret Updates

Based on the fresh deployment, update the following GitHub repository secrets:

### 🔑 Core Infrastructure Secrets

1. **AZURE_RESOURCE_GROUP**
   - **New Value:** `rg-botel-voice-v3-dev`
   - **Previous:** `rg-botel-voice-v2-dev`

2. **AZURE_CONTAINER_APP**
   - **New Value:** `ca-media-worker-dev`
   - **Previous:** `ca-media-worker-dev` (same name, but new environment)

3. **AZURE_CONTAINER_APP_ENVIRONMENT**
   - **New Value:** `cae-botel-voice-v3-dev`
   - **Previous:** `cae-botel-voice-v2-dev`

### 🌐 Service Endpoints

4. **SPEECH_ENDPOINT**
   - **New Value:** `https://speech-botel-voice-v3-dev.cognitiveservices.azure.com/`

5. **COSMOS_ENDPOINT**
   - **New Value:** `https://cosmos-botel-voice-v3-dev.documents.azure.com:443/`

6. **KEY_VAULT_NAME**
   - **New Value:** `kv-botelvoi-dev-x466l3`

7. **VOICE_LIVE_ENDPOINT**
   - **New Value:** `wss://eastus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1`

8. **VOICE_LIVE_MODEL**
   - **New Value:** `gpt-4o-realtime-preview`

### 📊 Monitoring

9. **APPLICATIONINSIGHTS_CONNECTION_STRING**
   - **New Value:** `InstrumentationKey=bd0a819b-6ec3-4ee8-8b5a-6235c02a400f;IngestionEndpoint=https://eastus2-3.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus2.livediagnostics.monitor.azure.com/;ApplicationId=8f82a401-e87c-4345-840f-1f4156a97070`

### 🔗 Communication Services

10. **ACS_CONNECTION_STRING**
    - **New Value:** `endpoint=https://acs-botel-voice-v3-dev.unitedstates.communication.azure.com/;accesskey=4u0GvFJEZo0GvfZst0ovPo8h44uNEeSMWvPuDYCQpATnz9e53dD3JQQJ99BFACULyCpL67kMAAAAAZCS2xv0`

## 🚀 How to Update Secrets

### Option 1: GitHub Web Interface
1. Go to your repository: `https://github.com/your-username/voice-agent-botel`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Update each secret listed above

### Option 2: GitHub CLI (if installed)
```bash
# Install GitHub CLI first if not available
# Then run these commands:

gh secret set AZURE_RESOURCE_GROUP --body "rg-botel-voice-v3-dev"
gh secret set AZURE_CONTAINER_APP --body "ca-media-worker-dev"
gh secret set AZURE_CONTAINER_APP_ENVIRONMENT --body "cae-botel-voice-v3-dev"
gh secret set SPEECH_ENDPOINT --body "https://speech-botel-voice-v3-dev.cognitiveservices.azure.com/"
gh secret set COSMOS_ENDPOINT --body "https://cosmos-botel-voice-v3-dev.documents.azure.com:443/"
gh secret set KEY_VAULT_NAME --body "kv-botelvoi-dev-x466l3"
gh secret set VOICE_LIVE_ENDPOINT --body "wss://eastus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1"
gh secret set VOICE_LIVE_MODEL --body "gpt-4o-realtime-preview"
gh secret set APPLICATIONINSIGHTS_CONNECTION_STRING --body "InstrumentationKey=bd0a819b-6ec3-4ee8-8b5a-6235c02a400f;IngestionEndpoint=https://eastus2-3.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus2.livediagnostics.monitor.azure.com/;ApplicationId=8f82a401-e87c-4345-840f-1f4156a97070"
gh secret set ACS_CONNECTION_STRING --body "endpoint=https://acs-botel-voice-v3-dev.unitedstates.communication.azure.com/;accesskey=4u0GvFJEZo0GvfZst0ovPo8h44uNEeSMWvPuDYCQpATnz9e53dD3JQQJ99BFACULyCpL67kMAAAAAZCS2xv0"
```

## ✅ Verification

After updating the secrets:
1. Check that all secrets are updated in GitHub Settings
2. Trigger a new deployment by pushing code or manually running the GitHub Action
3. Monitor the deployment logs to ensure the new resources are being used

## 🎯 New Container App URL

Your new media worker will be available at:
**https://ca-media-worker-dev.victorioustree-4c25e022.eastus2.azurecontainerapps.io**

## 🔄 Next Steps

1. ✅ Update GitHub secrets (this step)
2. 🚀 Push code to trigger GitHub Actions deployment
ok
3. 🧪 Test the media worker endpoints
4. 📊 Monitor performance and latency 