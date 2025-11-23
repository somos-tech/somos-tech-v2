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
            const error = new Error('COSMOS_ENDPOINT must be configured');
            console.error('[CosmosDB] CRITICAL: COSMOS_ENDPOINT environment variable is not set');
            throw error;
        }

        // Check for local development environment
        // Note: NODE_ENV might be 'dev' in Azure, so we check specifically for 'development'
        // or AZURE_FUNCTIONS_ENVIRONMENT being 'Development'
        const isLocal = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' ||
            process.env.NODE_ENV === 'development';
            
        console.log(`[CosmosDB] Initializing client`);
        console.log(`[CosmosDB]   Environment: ${process.env.NODE_ENV}`);
        console.log(`[CosmosDB]   AZURE_FUNCTIONS_ENVIRONMENT: ${process.env.AZURE_FUNCTIONS_ENVIRONMENT}`);
        console.log(`[CosmosDB]   isLocal: ${isLocal}`);
        console.log(`[CosmosDB]   Endpoint: ${endpoint}`);
        console.log(`[CosmosDB]   Database: ${process.env.COSMOS_DATABASE_NAME || 'somostech'}`);
        console.log(`[CosmosDB]   Credential type: ${isLocal ? 'DefaultAzureCredential' : 'ManagedIdentityCredential'}`);

        try {
            // Use DefaultAzureCredential for all environments as it handles
            // Managed Identity, CLI, VS Code, etc. automatically and robustly.
            const credential = new DefaultAzureCredential();
            
            client = new CosmosClient({ endpoint, aadCredentials: credential });
            console.log('[CosmosDB] Client initialized successfully');
        } catch (error) {
            console.error('[CosmosDB] CRITICAL: Failed to initialize Cosmos client:', error);
            console.error('[CosmosDB] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw error;
        }
    }
    return client;
}

/**
 * Get a Cosmos DB container by name
 * @param {string} containerName 
 * @returns {import('@azure/cosmos').Container}
 */
export function getContainer(containerName) {
    try {
        const client = getCosmosClient();
        const databaseName = process.env.COSMOS_DATABASE_NAME || 'somostech';
        console.log(`[CosmosDB] Getting container: ${databaseName}/${containerName}`);
        return client.database(databaseName).container(containerName);
    } catch (error) {
        console.error(`[CosmosDB] Failed to get container ${containerName}:`, error);
        throw error;
    }
}
