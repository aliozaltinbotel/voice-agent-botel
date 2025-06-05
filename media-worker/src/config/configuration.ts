export default () => ({
  server: {
    port: parseInt(process.env.PORT || '8080', 10),
    env: process.env.NODE_ENV || 'development',
  },
  voiceLive: {
    enabled: process.env.VOICE_LIVE_ENABLED === 'true',
    endpoint: process.env.VOICE_LIVE_ENDPOINT || 'wss://eastus2.voice.speech.microsoft.com/cognitiveservices/websocket/v1',
    model: process.env.VOICE_LIVE_MODEL || 'gpt-4o-realtime-preview',
  },
  speech: {
    endpoint: process.env.SPEECH_ENDPOINT || '',
    key: process.env.SPEECH_KEY || '',
    region: process.env.SPEECH_REGION || 'eastus2',
  },
  acs: {
    connectionString: process.env.ACS_CONNECTION_STRING || '',
  },
  cosmos: {
    endpoint: process.env.COSMOS_ENDPOINT || '',
    key: process.env.COSMOS_KEY || '',
    database: process.env.COSMOS_DATABASE_NAME || 'voice-agent-db',
    container: process.env.COSMOS_CONTAINER_NAME || 'conversations',
  },
  azure: {
    tenantId: process.env.AZURE_TENANT_ID || '',
    keyVaultName: process.env.KEY_VAULT_NAME || '',
    enablePrivateEndpoints: process.env.ENABLE_PRIVATE_ENDPOINTS === 'true',
    vnetIntegration: process.env.VNET_INTEGRATION === 'true',
  },
  applicationInsights: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  network: {
    enablePrivateEndpoints: process.env.ENABLE_PRIVATE_ENDPOINTS === 'true',
    vnetIntegration: process.env.VNET_INTEGRATION === 'true',
    ultraLowLatency: process.env.VNET_INTEGRATION === 'true',
  },
}); 