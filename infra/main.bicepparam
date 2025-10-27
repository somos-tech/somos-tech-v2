using './main.bicep'

param location = 'westus2'
param environmentName = 'dev'
param appName = 'somos-tech'
param nodeVersion = '20'
param maximumInstanceCount = 100
param instanceMemoryMB = 2048
param tags = {
  application: 'somos-tech'
  environment: 'dev'
  managedBy: 'bicep'
}
