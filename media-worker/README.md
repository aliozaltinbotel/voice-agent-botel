# Botel AI Media Worker Service

A NestJS-based media worker service for the Botel AI Voice Agent, designed to handle real-time voice conversations using Azure's Voice Live API.

## Architecture

### NestJS Modules

- **AppModule**: Main application module
- **HealthModule**: Health check endpoints
- **CallModule**: Call handling and WebSocket gateway
- **VoiceLiveModule**: Voice Live API integration
- **DatabaseModule**: Cosmos DB integration
- **TelemetryModule**: Application monitoring and telemetry

### Key Features

- **Voice Live API Integration**: Real-time voice conversations with <700ms latency
- **Call Management**: Handle incoming calls from Azure Communication Services
- **Real-time Events**: WebSocket gateway for live call monitoring
- **Health Monitoring**: Kubernetes-ready health check endpoints
- **Database Integration**: Cosmos DB for conversation storage
- **Clean Architecture**: SOLID principles with dependency injection

## API Endpoints

### Health Checks
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
- `GET /health/startup` - Startup probe

### Call Management
- `POST /calls/incoming` - Handle incoming call webhook
- `POST /calls/events` - Handle call events
- `GET /calls/active` - List active calls
- `GET /calls/:callId` - Get call details
- `POST /calls/:callId/end` - End a specific call

### WebSocket Events
- Namespace: `/calls`
- Events: `callStarted`, `callEnded`, `callFailed`, `transcript`, `demoScheduled`

## Environment Variables

```bash
# Server Configuration
PORT=8080
NODE_ENV=development
LOG_LEVEL=info

# Voice Live API
VOICE_LIVE_ENABLED=true
VOICE_LIVE_ENDPOINT=wss://eastus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1
VOICE_LIVE_MODEL=gpt-4o-realtime-preview
SPEECH_KEY=your-speech-service-key
SPEECH_REGION=eastus2

# Azure Communication Services
ACS_CONNECTION_STRING=your-acs-connection-string

# Cosmos DB
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=voice-agent-db
COSMOS_CONTAINER=conversations

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=your-app-insights-connection-string
```

## Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run start:dev
```

### Build
```bash
npm run build
```

### Production
```bash
npm run start:prod
```

## Docker

### Build Image
```bash
docker build -t botel-media-worker .
```

### Run Container
```bash
docker run -p 8080:8080 \
  -e SPEECH_KEY=your-key \
  -e ACS_CONNECTION_STRING=your-connection-string \
  botel-media-worker
```

## Architecture Benefits

### Performance
- **<700ms latency** with Voice Live API
- **Single WebSocket** replaces complex multi-service orchestration
- **Built-in audio processing** (noise suppression, echo cancellation)

### Scalability
- **Horizontal scaling** ready with stateless design
- **Event-driven architecture** with proper decoupling
- **Container-ready** with health checks

### Maintainability
- **Clean Architecture** with SOLID principles
- **Dependency Injection** for testability
- **TypeScript** for type safety
- **Swagger** API documentation

### Monitoring
- **Health checks** for Kubernetes deployment
- **Application Insights** integration ready
- **Structured logging** with NestJS Logger
- **Real-time events** via WebSocket

## Cost Optimization
- ~**$50/1000 minutes** with Voice Live API
- **12% cost savings** vs. multi-service approach
- **Reduced infrastructure** complexity

## AI Agent Configuration

The service includes a pre-configured AI agent "Sarah" optimized for short-term rental property managers:

- **Warm, professional tone**
- **Qualification criteria**: 5+ properties, manual guest handling
- **Goal**: Book qualified demos
- **Tools**: Schedule demo, check availability, send information

## Next Steps

1. **Deploy to Azure Container Apps** using the infrastructure templates
2. **Configure environment variables** from Key Vault
3. **Set up monitoring** with Application Insights
4. **Test voice conversations** with the Voice Live API
5. **Scale horizontally** based on call volume 