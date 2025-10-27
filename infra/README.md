# Infrastructure as Code - Azure Functions

This directory contains Bicep templates for deploying the Somos Tech Azure Functions API to Azure.

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- [Bicep CLI](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/install)
- An Azure subscription

## Resources Deployed

The Bicep template deploys the following Azure resources:

- **Azure Function App** (Linux, Node.js 20, Flex Consumption Plan)
- **App Service Plan** (Flex Consumption SKU - FC1)
- **Storage Account** (for Function App storage with managed identity authentication)
- **Application Insights** (for monitoring and logging)
- **Log Analytics Workspace** (for Application Insights)

### Flex Consumption Plan Benefits

This deployment uses the new **Flex Consumption plan**, which offers:
- Better performance and cold start times compared to the traditional Consumption plan
- More granular scaling control with configurable instance memory and maximum instance count
- Identity-based authentication to storage (no connection strings needed)
- The traditional Consumption plan (Y1 SKU) is being retired

## Deployment

### 1. Login to Azure

```bash
az login
```

### 2. Create a Resource Group

```bash
az group create --name rg-somos-tech-dev --location eastus
```

### 3. Deploy the Infrastructure

Using the parameters file:

```bash
az deployment group create \
  --resource-group rg-somos-tech-dev \
  --template-file main.bicep \
  --parameters main.bicepparam
```

Or with inline parameters:

```bash
az deployment group create \
  --resource-group rg-somos-tech-dev \
  --template-file main.bicep \
  --parameters environmentName=dev location=eastus
```

### 4. Deploy the Function App Code

After infrastructure is deployed, deploy your function code:

```bash
cd ../apps/api
func azure functionapp publish <function-app-name>
```

Or get the function app name from the deployment output:

```bash
FUNC_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.functionAppName.value \
  --output tsv)

cd ../apps/api
func azure functionapp publish $FUNC_NAME
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `location` | string | resourceGroup().location | Azure region for resources |
| `environmentName` | string | 'dev' | Environment name (dev, staging, prod) |
| `appName` | string | 'somos-tech' | Application name |
| `nodeVersion` | string | '20' | Node.js runtime version |
| `maximumInstanceCount` | int | 100 | Maximum number of instances for Flex Consumption |
| `instanceMemoryMB` | int | 2048 | Instance memory in MB (2048 or 4096) |
| `tags` | object | {...} | Tags to apply to resources |

## Outputs

| Output | Description |
|--------|-------------|
| `functionAppName` | Name of the deployed Function App |
| `functionAppHostName` | Host name of the Function App |
| `functionAppUrl` | Full URL of the Function App |
| `storageAccountName` | Name of the Storage Account |
| `appInsightsInstrumentationKey` | Application Insights instrumentation key |
| `appInsightsConnectionString` | Application Insights connection string |
| `functionAppPrincipalId` | Managed Identity Principal ID of the Function App |

## Different Environments

To deploy to different environments, update the parameters:

**Staging:**
```bash
az deployment group create \
  --resource-group rg-somos-tech-staging \
  --template-file main.bicep \
  --parameters environmentName=staging
```

**Production:**
```bash
az deployment group create \
  --resource-group rg-somos-tech-prod \
  --template-file main.bicep \
  --parameters environmentName=prod
```

## Clean Up

To delete all resources:

```bash
az group delete --name rg-somos-tech-dev --yes --no-wait
```

## Notes

- The Function App uses a **System-Assigned Managed Identity** for secure access to Azure resources
- Storage access uses **identity-based authentication** (no connection strings stored)
- CORS is configured to allow all origins (`*`) - update in production as needed
- Storage account uses **TLS 1.2** minimum and **HTTPS only**
- Application Insights sampling is configured per `host.json` settings
- The deployment uses a **Flex Consumption Plan** (FC1 SKU) for better performance and cost efficiency
- Maximum instance count set to 100 with 2048MB per instance (configurable)
