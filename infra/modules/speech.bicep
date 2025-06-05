@description('Speech service name')
param name string

@description('Location for Speech service')
param location string

@description('SKU for Speech service')
@allowed([
  'F0' // Free tier
  'S0' // Standard tier
])
param sku string = 'S0'

@description('Log Analytics Workspace ID for diagnostics')
param logAnalyticsWorkspaceId string = ''

resource speechService 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: name
  location: location
  kind: 'SpeechServices'
  sku: {
    name: sku
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    customSubDomainName: name
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Diagnostic settings - only if workspace ID provided
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(logAnalyticsWorkspaceId)) {
  name: 'diag-${speechService.name}'
  scope: speechService
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'RequestResponse'
        enabled: true
      }
      {
        category: 'Trace'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output id string = speechService.id
output name string = speechService.name
output endpoint string = speechService.properties.endpoint
output key string = speechService.listKeys().key1
output region string = location
output principalId string = speechService.identity.principalId 
