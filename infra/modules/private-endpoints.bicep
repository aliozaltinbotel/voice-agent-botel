

@description('Private endpoints subnet ID')
param privateEndpointsSubnetId string

@description('Location for private endpoints')
param location string

@description('Environment name')
param environment string

@description('Cosmos DB account name')
param cosmosAccountName string

@description('Key Vault name')
param keyVaultName string

@description('Speech service name')
param speechServiceName string

@description('Private DNS zone IDs')
param privateDnsZoneCosmosId string
param privateDnsZoneKeyVaultId string
param privateDnsZoneSpeechId string

// Private Endpoint for Cosmos DB
resource privateEndpointCosmos 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: 'pe-cosmos-${environment}'
  location: location
  properties: {
    subnet: {
      id: privateEndpointsSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'cosmos-connection'
        properties: {
          privateLinkServiceId: resourceId('Microsoft.DocumentDB/databaseAccounts', cosmosAccountName)
          groupIds: [
            'Sql'
          ]
        }
      }
    ]
  }
}

// Private DNS Zone Group for Cosmos DB
resource privateEndpointCosmosDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-05-01' = {
  parent: privateEndpointCosmos
  name: 'cosmos-dns-group'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'cosmos-config'
        properties: {
          privateDnsZoneId: privateDnsZoneCosmosId
        }
      }
    ]
  }
}

// Private Endpoint for Key Vault
resource privateEndpointKeyVault 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: 'pe-keyvault-${environment}'
  location: location
  properties: {
    subnet: {
      id: privateEndpointsSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'keyvault-connection'
        properties: {
          privateLinkServiceId: resourceId('Microsoft.KeyVault/vaults', keyVaultName)
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

// Private DNS Zone Group for Key Vault
resource privateEndpointKeyVaultDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-05-01' = {
  parent: privateEndpointKeyVault
  name: 'keyvault-dns-group'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'keyvault-config'
        properties: {
          privateDnsZoneId: privateDnsZoneKeyVaultId
        }
      }
    ]
  }
}

// Private Endpoint for Speech Services
resource privateEndpointSpeech 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: 'pe-speech-${environment}'
  location: location
  properties: {
    subnet: {
      id: privateEndpointsSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'speech-connection'
        properties: {
          privateLinkServiceId: resourceId('Microsoft.CognitiveServices/accounts', speechServiceName)
          groupIds: [
            'account'
          ]
        }
      }
    ]
  }
}

// Private DNS Zone Group for Speech Services
resource privateEndpointSpeechDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-05-01' = {
  parent: privateEndpointSpeech
  name: 'speech-dns-group'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'speech-config'
        properties: {
          privateDnsZoneId: privateDnsZoneSpeechId
        }
      }
    ]
  }
}

// Outputs
output cosmosPrivateEndpointId string = privateEndpointCosmos.id
output keyVaultPrivateEndpointId string = privateEndpointKeyVault.id
output speechPrivateEndpointId string = privateEndpointSpeech.id 
