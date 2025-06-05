@description('Container App name')
param name string

@description('Location for Container App')
param location string

@description('Container Apps Environment ID')
param containerAppsEnvironmentId string

@description('Container registry login server')
param registryLoginServer string = 'ghcr.io'

@description('Container image name')
param imageName string

@description('Environment variables')
param environmentVariables array = []

@description('Secrets configuration')
param secrets array = []

@description('CPU cores')
param cpu string = '1'

@description('Memory')
param memory string = '2Gi'

@description('Minimum replicas')
param minReplicas int = 1

@description('Maximum replicas')
param maxReplicas int = 10

@description('Workload profile for performance optimization')
param workloadProfile string = 'Consumption'

@description('Enable session affinity for better performance')
param enableSessionAffinity bool = true

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        allowInsecure: false
        clientCertificateMode: 'Ignore'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          maxAge: 3600
        }
        ipSecurityRestrictions: []
        stickySessions: {
          affinity: enableSessionAffinity ? 'sticky' : 'none'
        }
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: secrets
      registries: []
    }
    template: {
      containers: [
        {
          image: '${registryLoginServer}/${imageName}'
          name: 'media-worker'
          env: environmentVariables
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          probes: [
            {
              type: 'Readiness'
              httpGet: {
                path: '/health/ready'
                port: 8080
              }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/health/live'
                port: 8080
              }
              initialDelaySeconds: 30
              periodSeconds: 30
            }
          ]
        }
      ]
              scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '60' // Lower threshold for voice processing
              }
            }
          }
          {
            name: 'memory-scaling'
            custom: {
              type: 'memory'
              metadata: {
                type: 'Utilization'
                value: '70' // Lower threshold for better performance
              }
            }
          }
          {
            name: 'http-requests'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

output id string = containerApp.id
output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output principalId string = containerApp.identity.principalId 
