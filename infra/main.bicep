targetScope = 'subscription'

@description('The Azure region to deploy resources to')
param location string = 'eastus2'

@description('Environment name for resource naming')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string = 'dev'

@description('Base name for resources')
param baseName string = 'botel-voice'

@description('Enable ultra-low latency optimizations')
param enableUltraLowLatency bool = true

@description('Enable private endpoints for all services')
param enablePrivateEndpoints bool = true

@description('Virtual network address space')
param vnetAddressPrefix string = '10.0.0.0/16'

// Resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-${baseName}-${environment}'
  location: location
}

// Networking infrastructure for ultra-low latency
module networking 'modules/networking.bicep' = if (enableUltraLowLatency) {
  scope: rg
  name: 'networking'
  params: {
    vnetName: 'vnet-${baseName}-${environment}'
    location: location
    environment: environment
    addressPrefix: vnetAddressPrefix
  }
}

// Key Vault for secrets management
module keyVault 'modules/key-vault.bicep' = {
  scope: rg
  name: 'keyVault'
  params: {
    name: 'kv-${take(replace(baseName, '-', ''), 8)}-${environment}-${take(uniqueString(rg.id), 6)}'
    location: location
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
  }
}

// Application Insights and Log Analytics
module monitoring 'modules/monitoring.bicep' = {
  scope: rg
  name: 'monitoring'
  params: {
    baseName: baseName
    location: location
    environment: environment
  }
}

// Azure Communication Services (for phone numbers)
module acs 'modules/acs.bicep' = {
  scope: rg
  name: 'acs'
  params: {
    name: 'acs-${baseName}-${environment}'
    location: 'global' // ACS uses global location
    dataLocation: 'United States'
  }
}

// Azure AI Speech Services (required for Voice Live)
module speech 'modules/speech.bicep' = {
  scope: rg
  name: 'speech'
  params: {
    name: 'speech-${baseName}-${environment}'
    location: location
    sku: 'S0'
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
  }
}

// Voice Live API
module voiceLive 'modules/voice-live.bicep' = {
  scope: rg
  name: 'voiceLive'
  params: {
    name: 'voice-live-${baseName}'
    location: location
    model: 'gpt-4o-realtime-preview'
  }
}

// Cosmos DB for conversation storage
module cosmos 'modules/cosmos.bicep' = {
  scope: rg
  name: 'cosmos'
  params: {
    accountName: 'cosmos-${baseName}-${environment}'
    location: location
    databaseName: 'voice-agent-db'
    containerName: 'conversations'
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
  }
}

// Container Apps Environment with VNet integration
module containerAppsEnv 'modules/container-apps-env.bicep' = {
  scope: rg
  name: 'containerAppsEnv'
  params: {
    name: 'cae-${baseName}-${environment}'
    location: location
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    containerAppsSubnetId: enableUltraLowLatency ? networking.outputs.containerAppsSubnetId : ''
    enableVnetIntegration: enableUltraLowLatency
    enableZoneRedundancy: environment == 'prod'
  }
}

// Private endpoints for ultra-low latency communication
module privateEndpoints 'modules/private-endpoints.bicep' = if (enablePrivateEndpoints && enableUltraLowLatency) {
  scope: rg
  name: 'privateEndpoints'
  params: {

    privateEndpointsSubnetId: networking.outputs.privateEndpointsSubnetId
    location: location
    environment: environment
    cosmosAccountName: cosmos.outputs.name
    keyVaultName: keyVault.outputs.name
    speechServiceName: speech.outputs.name
    privateDnsZoneCosmosId: networking.outputs.privateDnsZoneCosmosId
    privateDnsZoneKeyVaultId: networking.outputs.privateDnsZoneKeyVaultId
    privateDnsZoneSpeechId: networking.outputs.privateDnsZoneSpeechId
  }
  dependsOn: [
    networking
  ]
}

// Media Worker Container App with ultra-low latency settings
module mediaWorker 'modules/container-app.bicep' = {
  scope: rg
  name: 'mediaWorker'
  params: {
    name: 'ca-media-worker-${environment}'
    location: location
    containerAppsEnvironmentId: containerAppsEnv.outputs.id
    registryLoginServer: 'mcr.microsoft.com'
    imageName: 'k8se/placeholder:latest'
    // Enhanced performance for voice processing
    cpu: enableUltraLowLatency ? '2' : '1'
    memory: enableUltraLowLatency ? '4Gi' : '2Gi'
    minReplicas: enableUltraLowLatency ? 2 : 1
    maxReplicas: enableUltraLowLatency ? 20 : 10
    environmentVariables: [
      {
        name: 'VOICE_LIVE_ENABLED'
        value: 'true'
      }
      {
        name: 'VOICE_LIVE_ENDPOINT'
        value: voiceLive.outputs.endpoint
      }
      {
        name: 'VOICE_LIVE_MODEL'
        value: voiceLive.outputs.model
      }
      {
        name: 'ACS_CONNECTION_STRING'
        secretRef: 'acs-connection-string'
      }
      {
        name: 'SPEECH_KEY'
        secretRef: 'speech-key'
      }
      {
        name: 'SPEECH_REGION'
        value: location
      }
      {
        name: 'COSMOS_ENDPOINT'
        value: cosmos.outputs.endpoint
      }
      {
        name: 'COSMOS_KEY'
        secretRef: 'cosmos-key'
      }
      {
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
        value: monitoring.outputs.appInsightsConnectionString
      }
    ]
    secrets: [
      {
        name: 'acs-connection-string'
        keyVaultUrl: '${keyVault.outputs.vaultUri}secrets/acs-connection-string'
        identity: 'system'
      }
      {
        name: 'speech-key'
        keyVaultUrl: '${keyVault.outputs.vaultUri}secrets/speech-key'
        identity: 'system'
      }
      {
        name: 'cosmos-key'
        keyVaultUrl: '${keyVault.outputs.vaultUri}secrets/cosmos-key'
        identity: 'system'
      }
    ]
  }
}

// Store secrets in Key Vault
module secrets 'modules/secrets.bicep' = {
  scope: rg
  name: 'secrets'
  params: {
    keyVaultName: keyVault.outputs.name
    acsConnectionString: acs.outputs.connectionString
    speechKey: speech.outputs.key
    cosmosKey: cosmos.outputs.primaryKey
  }
}

// Grant Container App access to Key Vault secrets
module keyVaultAccess 'modules/key-vault-access.bicep' = {
  scope: rg
  name: 'keyVaultAccess'
  params: {
    keyVaultName: keyVault.outputs.name
    principalId: mediaWorker.outputs.principalId
  }
}

// Outputs
output resourceGroupName string = rg.name
output keyVaultName string = keyVault.outputs.name
output acsConnectionString string = acs.outputs.connectionString
output speechEndpoint string = speech.outputs.endpoint
output voiceLiveEndpoint string = voiceLive.outputs.endpoint
output voiceLiveModel string = voiceLive.outputs.model

// Network optimization outputs
output vnetId string = enableUltraLowLatency ? networking.outputs.vnetId : ''
output vnetName string = enableUltraLowLatency ? networking.outputs.vnetName : ''
output containerAppsEnvironmentFqdn string = containerAppsEnv.outputs.defaultDomain
output containerAppFqdn string = mediaWorker.outputs.fqdn
output ultraLowLatencyEnabled bool = enableUltraLowLatency
output privateEndpointsEnabled bool = enablePrivateEndpoints
output cosmosEndpoint string = cosmos.outputs.endpoint
output containerAppUrl string = mediaWorker.outputs.fqdn
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString 
