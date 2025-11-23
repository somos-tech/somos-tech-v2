import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';

let client = null;

/**
 * Get the Cosmos DB client instance (Singleton)
 */
export function getCosmosClient() {
    if (!client) {
        const endpoint = process.env.COSMOS_ENDPOINT;
        if (!endpoint) {
            throw new Error('COSMOS_ENDPOINT must be configured');
        }

        // Check for local development environment
        // Note: NODE_ENV might be 'dev' in Azure, so we check specifically for 'development'
        // or AZURE_FUNCTIONS_ENVIRONMENT being 'Development'
        const isLocal = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' ||
            process.env.NODE_ENV === 'development';
            
        console.log(`[CosmosDB] Initializing client. Environment: ${process.env.NODE_ENV}, isLocal: ${isLocal}`);

        const credential = isLocal
            ? new DefaultAzureCredential()
            : new ManagedIdentityCredential();
        
        client = new CosmosClient({ endpoint, aadCredentials: credential });
    }
    return client;
}

/**
 * Get a Cosmos DB container by name
 * @param {string} containerName 
 * @returns {import('@azure/cosmos').Container}
 */
export function getContainer(containerName) {
    const client = getCosmosClient();
    const databaseName = process.env.COSMOS_DATABASE_NAME || 'somostech';
    return client.database(databaseName).container(containerName);
}
