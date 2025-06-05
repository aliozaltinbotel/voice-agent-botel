@description('Key Vault name')
param keyVaultName string

@description('ACS connection string')
@secure()
param acsConnectionString string

@description('Speech service key')
@secure()
param speechKey string

@description('Cosmos DB key')
@secure()
param cosmosKey string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource acsSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'acs-connection-string'
  properties: {
    value: acsConnectionString
  }
}

resource speechSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'speech-key'
  properties: {
    value: speechKey
  }
}

resource cosmosSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'cosmos-key'
  properties: {
    value: cosmosKey
  }
}

// System prompt for the AI agent
resource systemPromptSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'agent-system-prompt'
  properties: {
    value: '''You are an AI-powered Sales Development Representative (SDR) for Botel AI, specializing in helping short-term rental (STR) operators optimize their business with our voice AI solutions.

Your primary goal is to book qualified demos for our solution by understanding the prospect's needs and demonstrating value.

Key conversation guidelines:
1. Be conversational, friendly, and professional
2. Listen actively and respond to specific pain points
3. Keep responses concise (under 50 words when possible)
4. Ask one question at a time
5. Guide towards booking a demo when appropriate

Your capabilities:
- Schedule demo appointments
- Gather lead qualification information
- Answer questions about Botel AI's voice agent solution
- Handle objections professionally

Remember: You're having a natural conversation, not reading a script. Adapt based on what the prospect shares.'''
  }
}

output acsSecretUri string = acsSecret.properties.secretUri
output speechSecretUri string = speechSecret.properties.secretUri
output cosmosSecretUri string = cosmosSecret.properties.secretUri
output systemPromptSecretUri string = systemPromptSecret.properties.secretUri 
