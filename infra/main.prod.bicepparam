using './main.bicep'

param location = 'westus2'
param environmentName = 'prod'
param appName = 'somos-tech'
param nodeVersion = '20'
param azureAdTenantId = 'cff2ae9c-4810-4a92-a3e8-46e649cbdbe4'
param maximumInstanceCount = 100
param instanceMemoryMB = 2048
param tags = {
  application: 'somos-tech'
  environment: 'prod'
  managedBy: 'bicep'
}
