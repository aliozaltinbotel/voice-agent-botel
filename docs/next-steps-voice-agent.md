# 🚀 Next Steps: Building Your Voice AI SDR Agent

## ✅ Infrastructure Status

**Deployed Successfully:**
- ✅ Azure Communication Services (for phone numbers)
- ✅ Speech Services (for Voice Live API)
- ✅ Cosmos DB (for conversation storage)
- ✅ Container Apps Environment
- ✅ Key Vault (for secrets)
- ✅ Application Insights (for monitoring)

**Voice Live Endpoint:** `wss://eastus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1`

## 📋 Next Steps Overview

### Step 1: Build the Media Worker Application

The media worker is the heart of your voice agent. It handles:
- Phone call audio streaming from ACS
- WebSocket connection to Voice Live API
- Conversation state management
- CRM integration

```typescript
// Key components to implement in media-worker/src/

1. server.ts - Express server with WebSocket support
2. acs-handler.ts - Handle incoming calls from ACS
3. voice-live-client.ts - Manage Voice Live WebSocket
4. conversation-manager.ts - Track conversation state
5. crm-integration.ts - Botel AI CRM API calls
```

### Step 2: Implement Voice Live Integration

```typescript
// voice-live-client.ts structure
class VoiceLiveClient {
  private ws: WebSocket;
  private speechKey: string;
  private region: string;
  
  async connect() {
    // Connect to Voice Live WebSocket
    const url = `wss://${this.region}.voice.speech.microsoft.com/cognitiveservices/websocket/v1`;
    this.ws = new WebSocket(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.speechKey
      }
    });
  }
  
  async startConversation(config: VoiceConfig) {
    // Send initial configuration
    this.send({
      type: 'conversation.start',
      config: {
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
        instructions: await this.getSystemPrompt(),
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }
    });
  }
}
```

### Step 3: Implement ACS Call Handling

```typescript
// acs-handler.ts structure
class ACSCallHandler {
  private callClient: CallClient;
  private voiceLiveClient: VoiceLiveClient;
  
  async handleIncomingCall(callContext: IncomingCallContext) {
    // Accept the call
    const call = await callContext.accept();
    
    // Start audio streaming
    const audioStream = await call.startAudioStream({
      format: 'pcm16',
      sampleRate: 16000
    });
    
    // Connect to Voice Live
    await this.voiceLiveClient.connect();
    await this.voiceLiveClient.startConversation({
      callId: call.id,
      phoneNumber: call.sourcePhoneNumber
    });
    
    // Pipe audio between ACS and Voice Live
    audioStream.on('data', (audioData) => {
      this.voiceLiveClient.sendAudio(audioData);
    });
    
    this.voiceLiveClient.on('audio', (responseAudio) => {
      audioStream.write(responseAudio);
    });
  }
}
```

### Step 4: Configure Function Calling for CRM

```typescript
// Define functions for Voice Live to call
const functions = [
  {
    name: 'schedule_demo',
    description: 'Schedule a demo appointment',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Preferred date' },
        time: { type: 'string', description: 'Preferred time' },
        email: { type: 'string', description: 'Contact email' },
        company: { type: 'string', description: 'Company name' }
      }
    }
  },
  {
    name: 'check_availability',
    description: 'Check demo slot availability',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to check' }
      }
    }
  }
];
```

### Step 5: Build and Deploy Container

```bash
# Navigate to media worker
cd ../media-worker

# Create package.json if not exists
npm init -y

# Install dependencies
npm install express ws @azure/communication-calling @azure/cosmos dotenv
npm install -D typescript @types/node @types/express @types/ws

# Create tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}

# Build the application
npm run build

# Create Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.js"]

# Build and push Docker image
docker build -t ghcr.io/YOUR_ORG/media-worker:v1.0.0 .
docker push ghcr.io/YOUR_ORG/media-worker:v1.0.0

# Update Container App
az containerapp update \
  --name ca-media-worker-dev \
  --resource-group rg-botel-voice-dev \
  --image ghcr.io/YOUR_ORG/media-worker:v1.0.0
```

### Step 6: Configure Phone Numbers

```bash
# Purchase a phone number
az communication phonenumber purchase \
  --connection-string "YOUR_ACS_CONNECTION_STRING" \
  --phone-number "+18885551234" \
  --area-code "888" \
  --phone-number-type "tollFree" \
  --assignment-type "application" \
  --capabilities "inbound" "outbound"

# Configure webhook for incoming calls
az communication phonenumber update \
  --phone-number "+18885551234" \
  --webhook-url "https://ca-media-worker-dev.wittyisland-e788fb35.eastus2.azurecontainerapps.io/incoming-call"
```

### Step 7: System Prompt Configuration

Update the agent's personality in Key Vault:

```bash
az keyvault secret set \
  --vault-name kv-botel-voice-dev-bxmc \
  --name "agent-system-prompt" \
  --value @system-prompt.txt
```

Example system prompt:
```
You are Sarah, an AI-powered SDR for Botel AI. You're warm, professional, and genuinely interested in helping short-term rental operators succeed.

Your goal: Book qualified demos for our AI voice agent solution.

Key talking points:
- 24/7 guest support without hiring staff
- Handles booking inquiries, maintenance requests, check-in questions
- Integrates with property management systems
- Saves 20+ hours per week

Qualification criteria:
- Manages 5+ properties
- Currently handling guest calls manually
- Interested in automation

Always:
- Be conversational and natural
- Listen for pain points
- Guide toward booking a demo
- Collect: name, email, company, property count
```

### Step 8: Testing & Monitoring

```bash
# Test health endpoints
curl https://ca-media-worker-dev.wittyisland-e788fb35.eastus2.azurecontainerapps.io/health/ready

# View real-time logs
az containerapp logs show \
  --name ca-media-worker-dev \
  --resource-group rg-botel-voice-dev \
  --follow

# Monitor in Application Insights
# Go to Azure Portal > Application Insights > Live Metrics
```

### Step 9: Production Readiness

1. **Error Handling**
   - Implement retry logic for Voice Live connection
   - Graceful degradation if services unavailable
   - Proper logging and alerting

2. **Security**
   - Validate webhook signatures from ACS
   - Rate limiting on endpoints
   - Input sanitization

3. **Performance**
   - Connection pooling for Cosmos DB
   - WebSocket reconnection logic
   - Audio buffer management

4. **Compliance**
   - Call recording consent
   - GDPR data handling
   - PII redaction in logs

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| First response time | < 2s |
| Conversation latency | < 500ms |
| Demo booking rate | > 15% |
| Call completion rate | > 90% |
| Customer satisfaction | > 4.5/5 |

## 🎯 Week-by-Week Timeline

**Week 1:**
- ✅ Infrastructure deployment (DONE!)
- Build basic media worker with ACS integration
- Test Voice Live WebSocket connection

**Week 2:**
- Implement conversation flow
- Add function calling for demo booking
- Create Cosmos DB integration

**Week 3:**
- CRM integration
- System prompt optimization
- Error handling and retry logic

**Week 4:**
- Testing and optimization
- Deploy to production
- Monitor and iterate

## 🚀 Quick Start Commands

```bash
# 1. Clone and setup
git clone https://github.com/your-org/botel-voice-agent
cd botel-voice-agent/media-worker
npm install

# 2. Local development
npm run dev

# 3. Build and deploy
npm run build
docker build -t media-worker:latest .
az containerapp update --name ca-media-worker-dev --image media-worker:latest

# 4. Test with a call
# Call your provisioned phone number!
```

---

**You're ready to build!** The infrastructure is deployed, Voice Live API is configured, and you have a clear path to implement your voice AI SDR agent. Start with the media worker implementation and iterate from there! 