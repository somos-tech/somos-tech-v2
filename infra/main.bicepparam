using './main.bicep'

param environmentName = 'dev'
param appName = 'somos-tech'
param location = 'eastus'
param azureAdTenantId = 'cff2ae9c-4810-4a92-a3e8-46e649cbdbe4'
param allowedAdminDomain = 'somos.tech'
param nodeVersion = '20'
param maximumInstanceCount = 100
param instanceMemoryMB = 2048
