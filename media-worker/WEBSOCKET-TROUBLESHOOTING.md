# WebSocket Connection Troubleshooting Guide

## Issue: Voice Live API WebSocket Connection Timeout

When running the media worker in Azure Container Apps, you may encounter WebSocket connection timeouts to Azure Speech Services:

```
Voice Live API (WebSocket):
Status: Error (Connection timeout)
Latency: 5,004ms
Issue: WebSocket connection to Azure Speech Services timing out
```

## Root Cause

Azure Speech-to-Text services **only support WebSocket protocol**, not REST API. The WebSocket connection can fail in containerized environments due to:

1. Network policies blocking WebSocket connections
2. Authentication issues when using subscription keys in containers
3. Proxy configuration requirements
4. Container runtime restrictions

## Solutions

### 1. Environment Variables

Set the following environment variables in your Container App:

```bash
# Identify container environment
CONTAINER_APP_NAME=ca-media-worker-dev

# Enable Voice Live API
VOICE_LIVE_ENABLED=true

# Speech Service Configuration
SPEECH_KEY=<your-speech-key>
SPEECH_REGION=eastus2
SPEECH_ENDPOINT=https://eastus2.api.cognitive.microsoft.com/

# Optional: Container Mode (for future Speech container deployment)
SPEECH_CONTAINER_MODE=false
SPEECH_CONTAINER_HOST=

# Network configuration (if using proxy)
HTTP_PROXY=
HTTPS_PROXY=
NO_PROXY=
```

### 2. Container App Configuration

Ensure your Azure Container App has proper ingress configuration:

- **HTTP/2 Support**: WebSocket requires HTTP/1.1 or HTTP/2
- **Session Affinity**: Enable sticky sessions for consistent WebSocket connections
- **Timeout Settings**: Increase request timeout (default is 240 seconds)

### 3. Network Configuration

If using VNet integration with private endpoints:

1. Ensure outbound traffic to Speech Services is allowed
2. Check NSG rules for WebSocket traffic (TCP 443)
3. Verify DNS resolution for `*.stt.speech.microsoft.com`

### 4. Code Implementation

The Voice Live service now includes:

- Automatic retry logic with exponential backoff
- Container environment detection
- Graceful degradation when WebSocket fails
- Connection state monitoring

### 5. Alternative: Deploy Speech Container

For ultra-low latency and reliability, consider deploying an Azure Speech container alongside your media worker:

```yaml
# Add to your deployment:
- name: speech-to-text
  image: mcr.microsoft.com/azure-cognitive-services/speechservices/speech-to-text:latest
  ports:
    - containerPort: 5000
  env:
    - name: Eula
      value: accept
    - name: Billing
      value: $(SPEECH_ENDPOINT)
    - name: ApiKey
      value: $(SPEECH_KEY)
```

Then configure the media worker to use container mode:

```bash
SPEECH_CONTAINER_MODE=true
SPEECH_CONTAINER_HOST=ws://speech-to-text:5000
```

## Monitoring

Check the logs for connection status:

```bash
az containerapp logs show \
  --name ca-media-worker-dev \
  --resource-group rg-botel-voice-v3-dev \
  --follow --tail 50
```

Look for:
- `Connecting to Azure Speech Services at wss://...`
- `WebSocket connection established successfully`
- `Attempting to reconnect (X/5)`

## Testing

Use the connectivity test endpoint to verify WebSocket connectivity:

```bash
curl https://your-app.azurecontainerapps.io/connectivity/test
```

## Known Limitations

1. Speech-to-Text only supports WebSocket, not REST API
2. WebSocket connections may fail during container cold starts
3. Some proxy configurations may not be fully supported by the Speech SDK

## Support

If issues persist:

1. Enable Speech SDK logging: `SPEECH-LogFilename=/tmp/speech-sdk.log`
2. Check Application Insights for detailed error tracking
3. Contact Azure Support with the correlation ID from failed requests 