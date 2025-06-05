@description('Container Apps Environment name')
param name string

@description('Location for Container Apps Environment')
param location string

@description('Log Analytics Workspace ID')
param logAnalyticsWorkspaceId string

@description('Application Insights connection string')
@secure()
param appInsightsConnectionString string

@description('Container Apps subnet ID for VNet integration')
param containerAppsSubnetId string = ''

@description('Enable VNet integration for ultra-low latency')
param enableVnetIntegration bool = true

@description('Enable zone redundancy for high availability')
param enableZoneRedundancy bool = false

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: name
  location: location
  properties: {
    daprAIConnectionString: appInsightsConnectionString
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2022-10-01').customerId
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2022-10-01').primarySharedKey
      }
    }
    // VNet integration for ultra-low latency
    vnetConfiguration: enableVnetIntegration ? {
      infrastructureSubnetId: containerAppsSubnetId
      internal: false // Set to true for completely private environment
    } : null
    zoneRedundant: enableZoneRedundancy
    peerAuthentication: {
      mtls: {
        enabled: false
      }
    }
    // Enhanced performance settings
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
      {
        name: 'high-perf'
        workloadProfileType: 'D4'
        minimumCount: 1
        maximumCount: 10
      }
    ]
  }
}

// Dapr component for Application Insights
resource daprAppInsights 'Microsoft.App/managedEnvironments/daprComponents@2023-05-01' = {
  parent: containerAppsEnvironment
  name: 'appinsights'
  properties: {
    componentType: 'configuration.azure.appconfig'
    version: 'v1'
    metadata: [
      {
        name: 'connectionString'
        value: appInsightsConnectionString
      }
    ]
    scopes: []
  }
}

output id string = containerAppsEnvironment.id
output name string = containerAppsEnvironment.name
output defaultDomain string = containerAppsEnvironment.properties.defaultDomain
output staticIp string = containerAppsEnvironment.properties.staticIp 
