@description('Voice Live API configuration name')
param name string

@description('Location for Voice Live API - must be eastus2 or swedencentral')
@allowed([
  'eastus2'
  'swedencentral'
])
param location string = 'eastus2'

@description('Model to use for Voice Live API')
@allowed([
  'gpt-4o-realtime-preview'
  'gpt-4o-mini-realtime-preview'
])
param model string = 'gpt-4o-realtime-preview'

// Voice Live API doesn't require deployment - it's accessed directly via WebSocket
// This module just returns the configuration

output name string = name
output endpoint string = 'wss://${location}.voice.speech.microsoft.com/cognitiveservices/websocket/v1'
output model string = model 
