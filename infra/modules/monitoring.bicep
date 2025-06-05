@description('Base name for resources')
param baseName string

@description('Location for resources')
param location string

@description('Environment name')
param environment string

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${baseName}-${environment}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: 1
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${baseName}-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    RetentionInDays: 30
  }
}

// Azure Monitor Workbook for voice agent dashboard
resource workbook 'Microsoft.Insights/workbooks@2022-04-01' = {
  name: guid('workbook-${baseName}-${environment}')
  location: location
  kind: 'shared'
  properties: {
    displayName: 'Voice Agent Performance Dashboard'
    category: 'Voice Agent'
    sourceId: appInsights.id
    serializedData: '''{
      "version": "Notebook/1.0",
      "items": [
        {
          "type": 1,
          "content": {
            "json": "# Voice Agent Performance Dashboard\\n\\nMonitoring latency, call metrics, and system performance for Botel AI Voice Agent"
          },
          "name": "header"
        },
        {
          "type": 9,
          "content": {
            "version": "KqlParameterItem/1.0",
            "parameters": [
              {
                "id": "timeRange",
                "version": "KqlParameterItem/1.0",
                "name": "TimeRange",
                "type": 4,
                "isRequired": true,
                "value": {
                  "durationMs": 86400000
                },
                "typeSettings": {
                  "selectableValues": [
                    { "durationMs": 300000 },
                    { "durationMs": 900000 },
                    { "durationMs": 1800000 },
                    { "durationMs": 3600000 },
                    { "durationMs": 14400000 },
                    { "durationMs": 43200000 },
                    { "durationMs": 86400000 },
                    { "durationMs": 172800000 },
                    { "durationMs": 259200000 },
                    { "durationMs": 604800000 },
                    { "durationMs": 1209600000 },
                    { "durationMs": 2419200000 },
                    { "durationMs": 2592000000 },
                    { "durationMs": 5184000000 },
                    { "durationMs": 7776000000 }
                  ]
                }
              }
            ]
          },
          "name": "parameters"
        },
        {
          "type": 3,
          "content": {
            "version": "KqlItem/1.0",
            "query": "customMetrics\\n| where name == \\"roundTripLatency\\"\\n| project timestamp, value\\n| summarize percentiles(value, 50, 95, 99) by bin(timestamp, 5m)\\n| render timechart",
            "size": 0,
            "title": "Round Trip Latency (ms) - P50, P95, P99",
            "timeContext": {
              "durationMs": 0
            },
            "timeContextFromParameter": "TimeRange",
            "queryType": 0,
            "resourceType": "microsoft.insights/components"
          },
          "name": "latencyChart"
        }
      ]
    }'''
  }
}

output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output logAnalyticsWorkspaceName string = logAnalyticsWorkspace.name
output appInsightsId string = appInsights.id
output appInsightsName string = appInsights.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey 