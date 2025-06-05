@description('ACS resource name')
param name string

@description('Location for ACS - must be global')
param location string = 'global'

@description('Data location for ACS')
@allowed([
  'Europe'
  'United States'
  'Asia Pacific'
  'Australia'
  'UK'
  'Canada'
  'India'
  'Japan'
])
param dataLocation string = 'Europe'

resource acs 'Microsoft.Communication/communicationServices@2023-03-31' = {
  name: name
  location: location
  properties: {
    dataLocation: dataLocation
  }
}

output id string = acs.id
output name string = acs.name
output connectionString string = acs.listKeys().primaryConnectionString
output endpoint string = acs.properties.hostName 
