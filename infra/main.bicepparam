using './main.bicep'

param environmentName = 'dev'
param appName = 'somos-tech'
param location = 'eastus'
param azureAdTenantId = 'cff2ae9c-4810-4a92-a3e8-46e649cbdbe4'
param azureAdClientId = 'dcf7379e-4576-4544-893f-77d6649390d3'
param allowedAdminDomain = 'somos.tech'
param azureOpenAiEndpoint = 'https://jcruz-meaqqqm1-eastus2.services.ai.azure.com/api/projects/jcruz-meaqqqm1-eastus2-project'
param azureOpenAiApiVersion = '2025-05-15-preview'
param azureOpenAiAgentId = 'asst_1mvpvMraOeK1QXtdJ8SqP1xr'
param nodeVersion = '20'
param maximumInstanceCount = 100
param instanceMemoryMB = 2048
