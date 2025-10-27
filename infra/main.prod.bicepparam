using './main.bicep'

param location = 'westus2'
param environmentName = 'prod'
param appName = 'somos-tech'
param nodeVersion = '20'
param maximumInstanceCount = 100
param instanceMemoryMB = 2048
param tags = {
  application: 'somos-tech'
  environment: 'prod'
  managedBy: 'bicep'
}
