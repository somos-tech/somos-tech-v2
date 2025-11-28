@description('The Azure region where resources will be deployed')
param location string = resourceGroup().location

@description('The environment name (e.g., dev, prod)')
@allowed([
  'dev'
  'prod'
])
param environmentName string = 'dev'

@description('The name of the application')
param appName string = 'somos-tech'

@description('Node.js runtime version')
param nodeVersion string = '20'

@description('Maximum number of instances for Flex Consumption')
param maximumInstanceCount int = 100

@description('Instance memory in MB for Flex Consumption (2048, 4096)')
@allowed([
  2048
  4096
])
param instanceMemoryMB int = 2048

@description('Tags to apply to all resources')
param tags object = {
  application: 'somos-tech'
  environment: environmentName
}

@description('Azure AD Tenant ID for authentication')
param azureAdTenantId string

@description('Azure AD Application (Client) ID for Static Web App authentication')
param azureAdClientId string

@description('Azure AD Client Secret for Static Web App authentication')
@secure()
param azureAdClientSecret string

@description('External ID Tenant ID for CIAM authentication')
param externalTenantId string = ''

@description('External ID Admin Client ID for CIAM authentication')
param externalAdminClientId string = ''

@description('External ID Admin Client Secret for CIAM authentication')
@secure()
param externalAdminClientSecret string = ''

@description('Auth0 Domain for member CIAM authentication (e.g., your-tenant.us.auth0.com)')
param auth0Domain string = ''

@description('Auth0 Client ID for member CIAM authentication')
param auth0ClientId string = ''

@description('Auth0 Client Secret for member CIAM authentication')
@secure()
param auth0ClientSecret string = ''

@description('GitHub OAuth Client ID (optional)')
param githubClientId string = ''

@description('GitHub OAuth Client Secret (optional)')
@secure()
param githubClientSecret string = ''

@description('Allowed admin email domain (e.g., somos.tech)')
param allowedAdminDomain string = 'somos.tech'

@description('Azure OpenAI endpoint URL')
param azureOpenAiEndpoint string

@description('Azure OpenAI API version')
param azureOpenAiApiVersion string = '2025-05-15-preview'

@description('Azure OpenAI Agent ID')
param azureOpenAiAgentId string

@description('Azure OpenAI deployment/model name')
param azureOpenAiDeploymentName string = 'gpt-5'

@description('Social Media Agent ID (defaults to main agent ID if not specified)')
param socialMediaAgentId string = ''

@description('Venue Agent ID (defaults to main agent ID if not specified)')
param venueAgentId string = ''

@description('List of ISO 3166-1 alpha-2 country codes Azure Front Door allows (all other traffic is blocked). Defaults to United States, Canada, Mexico, and United Kingdom to satisfy compliance requirements.')
param frontDoorAllowedCountries array = [
  'US'
  'CA'
  'MX'
  'GB'
]

// Variables for resource naming
var resourceSuffix = '${appName}-${environmentName}-${uniqueString(resourceGroup().id)}'
var uniqueSuffix = uniqueString(resourceGroup().id)
var storageAccountName = toLower(take('st${replace(appName, '-', '')}${environmentName}${uniqueSuffix}', 24))
var functionAppName = 'func-${resourceSuffix}'
var appServicePlanName = 'asp-${resourceSuffix}'
var appInsightsName = 'appi-${resourceSuffix}'
var logAnalyticsName = 'log-${resourceSuffix}'
var staticWebAppName = 'swa-${resourceSuffix}'
var cosmosDbAccountName = 'cosmos-${resourceSuffix}'
var cosmosDbDatabaseName = 'somostech'
var frontDoorProfileName = 'afd-${resourceSuffix}'
var frontDoorEndpointName = 'afd-endpoint-${resourceSuffix}'
var frontDoorOriginGroupName = 'afd-origingroup-${resourceSuffix}'
var frontDoorOriginName = 'afd-origin-${resourceSuffix}'
var frontDoorRouteName = 'afd-route-${resourceSuffix}'
var frontDoorWafPolicyName = 'afd-waf-${resourceSuffix}'
var frontDoorSecurityPolicyName = 'afd-security-${resourceSuffix}'

// Storage Blob Data Owner role definition ID
var storageBlobDataOwnerRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
)

// Log Analytics Workspace for Application Insights
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights for monitoring
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Cosmos DB Account
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosDbAccountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240
        backupRetentionIntervalInHours: 8
        backupStorageRedundancy: 'Local'
      }
    }
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosDbAccount
  name: cosmosDbDatabaseName
  properties: {
    resource: {
      id: cosmosDbDatabaseName
    }
  }
}

// Cosmos DB Container for Members
resource memberContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'members'
  properties: {
    resource: {
      id: 'members'
      partitionKey: {
        paths: [
          '/email'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
      uniqueKeyPolicy: {
        uniqueKeys: [
          {
            paths: [
              '/email'
            ]
          }
        ]
      }
    }
  }
}

// Cosmos DB Container for Events
resource eventContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'events'
  properties: {
    resource: {
      id: 'events'
      partitionKey: {
        paths: [
          '/chapter'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
  }
}

// Cosmos DB Container for Admin Users
resource adminUserContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'admin-users'
  properties: {
    resource: {
      id: 'admin-users'
      partitionKey: {
        paths: [
          '/email'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
      uniqueKeyPolicy: {
        uniqueKeys: [
          {
            paths: [
              '/email'
            ]
          }
        ]
      }
    }
  }
}

// Cosmos DB Container for Users
resource userContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
        version: 2
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
        compositeIndexes: [
          [
            {
              path: '/status'
              order: 'ascending'
            }
            {
              path: '/createdAt'
              order: 'descending'
            }
          ]
        ]
      }
      uniqueKeyPolicy: {
        uniqueKeys: [
          {
            paths: [
              '/email'
            ]
          }
        ]
      }
    }
  }
}

// Cosmos DB Container for Notifications
resource notificationContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'notifications'
  properties: {
    resource: {
      id: 'notifications'
      partitionKey: {
        paths: [
          '/type'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
  }
}

// Storage Account for Azure Functions
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

// App Service Plan (Flex Consumption Plan for Azure Functions)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// Azure Function App
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    reserved: true
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storageAccount.properties.primaryEndpoints.blob}deploymentpackage'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: maximumInstanceCount
        instanceMemoryMB: instanceMemoryMB
      }
      runtime: {
        name: 'node'
        version: nodeVersion
      }
    }
    siteConfig: {
      cors: {
        allowedOrigins: [
          'https://${staticWebApp.properties.defaultHostname}'
          'https://portal.azure.com'
          'https://dev.somos.tech'
          'http://localhost:5173'
          'https://localhost:5173'
        ]
        supportCredentials: true
      }
      appSettings: concat([
        {
          name: 'AzureWebJobsStorage__accountName'
          value: storageAccount.name
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'AZURE_STORAGE_ACCOUNT_NAME'
          value: storageAccount.name
        }
        {
          name: 'COSMOS_ENDPOINT'
          value: cosmosDbAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_KEY'
          value: cosmosDbAccount.listKeys().primaryMasterKey
        }
        {
          name: 'COSMOS_DATABASE_NAME'
          value: cosmosDbDatabaseName
        }
        {
          name: 'AZURE_TENANT_ID'
          value: azureAdTenantId
        }
        {
          name: 'ALLOWED_ADMIN_DOMAIN'
          value: allowedAdminDomain
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: azureOpenAiEndpoint
        }
        {
          name: 'AZURE_OPENAI_API_VERSION'
          value: azureOpenAiApiVersion
        }
        {
          name: 'AZURE_OPENAI_AGENT_ID'
          value: azureOpenAiAgentId
        }
        {
          name: 'AZURE_OPENAI_DEPLOYMENT_NAME'
          value: azureOpenAiDeploymentName
        }
        {
          name: 'SOCIAL_MEDIA_AGENT_ID'
          value: !empty(socialMediaAgentId) ? socialMediaAgentId : azureOpenAiAgentId
        }
        {
          name: 'VENUE_AGENT_ID'
          value: !empty(venueAgentId) ? venueAgentId : azureOpenAiAgentId
        }
      ],
      !empty(externalTenantId) && !empty(externalAdminClientId)
        ? [
            {
              name: 'EXTERNAL_TENANT_ID'
              value: externalTenantId
            }
            {
              name: 'EXTERNAL_ADMIN_CLIENT_ID'
              value: externalAdminClientId
            }
          ]
        : [],
      !empty(auth0Domain) && !empty(auth0ClientId)
        ? [
            {
              name: 'AUTH0_DOMAIN'
              value: auth0Domain
            }
            {
              name: 'AUTH0_CLIENT_ID'
              value: auth0ClientId
            }
          ]
        : []
      )
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

// Role assignment for Function App to access Storage Account (Blob)
resource functionAppStorageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, storageBlobDataOwnerRoleId)
  scope: storageAccount
  properties: {
    roleDefinitionId: storageBlobDataOwnerRoleId
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Disable authentication on Function App to allow public admin check endpoint
resource functionAppAuthSettings 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: functionApp
  name: 'authsettingsV2'
  properties: {
    platform: {
      enabled: false
    }
    globalValidation: {
      requireAuthentication: false
      unauthenticatedClientAction: 'AllowAnonymous'
    }
    identityProviders: {
      azureStaticWebApps: {
        enabled: false
      }
    }
  }
}

// Role assignment for Function App to access Cosmos DB
resource functionAppCosmosDbRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmosDbAccount
  name: guid(cosmosDbAccount.id, functionApp.id, '00000000-0000-0000-0000-000000000002')
  properties: {
    roleDefinitionId: '${cosmosDbAccount.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    principalId: functionApp.identity.principalId
    scope: cosmosDbAccount.id
  }
}

// Create deployment container in storage account
resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/deploymentpackage'
  properties: {
    publicAccess: 'None'
  }
}

// Create public container for site images (group covers, event images, etc.)
resource siteImagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/site-images'
}

// Azure Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/somos-tech/somos-tech-v2'
    branch: 'main'
    buildProperties: {
      appLocation: '/apps/web'
      apiLocation: '/apps/web/api'
      outputLocation: 'dist'
      appBuildCommand: 'npm run build'
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

// Configure environment variables for Static Web App
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: union(
    {
      VITE_ENVIRONMENT: environmentName
      AZURE_CLIENT_ID: azureAdClientId
      AZURE_CLIENT_SECRET: azureAdClientSecret
      AZURE_TENANT_ID: azureAdTenantId
      // Admin AAD settings referenced by staticwebapp.config.json auth configuration
      ADMIN_AAD_CLIENT_ID: azureAdClientId
      ADMIN_AAD_CLIENT_SECRET: azureAdClientSecret
    },
    !empty(externalTenantId) && !empty(externalAdminClientId)
      ? {
          EXTERNAL_TENANT_ID: externalTenantId
          EXTERNAL_ADMIN_CLIENT_ID: externalAdminClientId
          EXTERNAL_ADMIN_CLIENT_SECRET: externalAdminClientSecret
        }
      : {},
    !empty(auth0Domain) && !empty(auth0ClientId)
      ? {
          AUTH0_DOMAIN: auth0Domain
          AUTH0_CLIENT_ID: auth0ClientId
          AUTH0_CLIENT_SECRET: auth0ClientSecret
        }
      : {},
    !empty(githubClientId)
      ? {
          GITHUB_CLIENT_ID: githubClientId
          GITHUB_CLIENT_SECRET: githubClientSecret
        }
      : {}
  )
}

// Azure Front Door Standard profile to sit in front of the Static Web App
// This provides SSL/TLS termination, geo-blocking via WAF, and DDoS protection
// Note: The same Front Door profile is shared across dev and prod environments for cost optimization
// Current Status:
//   - DEV: Fully configured with custom domain (dev.somos.tech) and geo-blocking WAF
//   - PROD: Pending - needs custom domain (somos.tech) to be added manually via Azure CLI
// Custom domains must be added via Azure CLI after initial deployment:
//   az afd custom-domain create --profile-name <profile> --custom-domain-name <name> --host-name <domain>
resource frontDoorProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: frontDoorProfileName
  location: 'global'
  tags: tags
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
}

resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: frontDoorProfile
  name: frontDoorEndpointName
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource frontDoorOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoorProfile
  name: frontDoorOriginGroupName
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
    }
    healthProbeSettings: {
      probeIntervalInSeconds: 120
      probePath: '/'
      probeProtocol: 'Https'
      probeRequestType: 'HEAD'
    }
  }
}

resource frontDoorOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: frontDoorOriginGroup
  name: frontDoorOriginName
  properties: {
    hostName: staticWebApp.properties.defaultHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: staticWebApp.properties.defaultHostname
    priority: 1
    weight: 1000
  }
}

resource frontDoorRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: frontDoorEndpoint
  name: frontDoorRouteName
  dependsOn: [
    frontDoorOrigin
  ]
  properties: {
    originGroup: {
      id: frontDoorOriginGroup.id
    }
    supportedProtocols: [
      'Http'
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    httpsRedirect: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
  }
}

// Front Door WAF Policy for geo-allowlisting and security
// Blocks all traffic from countries not in the frontDoorAllowedCountries array (default: US/CA/MX/UK)
// Current Configuration:
//   - Mode: Prevention (actively blocks, not just detects)
//   - Custom Rule: BlockAnonymousNetworks (priority 100)
//   - Action: Returns 403 Forbidden with custom HTML message
//   - Applied to: All routes via frontDoorSecurityPolicy
resource frontDoorWafPolicy 'Microsoft.Cdn/cdnWebApplicationFirewallPolicies@2023-05-01' = {
  name: frontDoorWafPolicyName
  location: 'global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
      defaultCustomBlockResponseStatusCode: 403
      defaultCustomBlockResponseBody: base64('<html><body><h1>Access restricted</h1><p>Traffic is allowed only from ${join(frontDoorAllowedCountries, ', ')}.</p></body></html>')
    }
    customRules: {
      rules: [
        {
          name: 'BlockAnonymousNetworks'
          priority: 100
          enabledState: 'Enabled'
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'GeoMatch'
              matchValue: frontDoorAllowedCountries
              negateCondition: true
              transforms: []
            }
          ]
        }
      ]
    }
  }
}

// Security Policy linking WAF to Front Door endpoints
// This applies the geo-blocking WAF policy to all traffic through the Front Door
resource frontDoorSecurityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2023-05-01' = {
  parent: frontDoorProfile
  name: frontDoorSecurityPolicyName
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: frontDoorWafPolicy.id
      }
      associations: [
        {
          domains: [
            {
              id: frontDoorEndpoint.id
            }
          ]
          patternsToMatch: [
            '/*'
          ]
        }
      ]
    }
  }
}

// Link Function App as backend for Static Web App
// Outputs
output functionAppName string = functionApp.name
output functionAppHostName string = functionApp.properties.defaultHostName
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output storageAccountName string = storageAccount.name
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output functionAppPrincipalId string = functionApp.identity.principalId
output staticWebAppName string = staticWebApp.name
output frontDoorEndpointHostName string = frontDoorEndpoint.properties.hostName
output frontDoorWafPolicyId string = frontDoorWafPolicy.id
output frontDoorProfileName string = frontDoorProfile.name
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output cosmosDbAccountName string = cosmosDbAccount.name
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output cosmosDbDatabaseName string = cosmosDbDatabaseName
output azureTenantId string = azureAdTenantId
output allowedAdminDomain string = allowedAdminDomain
output siteImagesContainerUrl string = '${storageAccount.properties.primaryEndpoints.blob}site-images/'
