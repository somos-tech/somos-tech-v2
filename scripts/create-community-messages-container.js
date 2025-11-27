/**
 * Script to create the community-messages container in Cosmos DB
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function createContainer() {
    const endpoint = 'https://cosmos-somos-tech-dev-64qb73pzvgekw.documents.azure.com:443/';
    const databaseName = 'somostech';
    const containerName = 'community-messages';
    
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({ endpoint, aadCredentials: credential });
    
    console.log('Creating container:', containerName);
    
    const { container } = await client.database(databaseName).containers.createIfNotExists({
        id: containerName,
        partitionKey: { paths: ['/channelId'] },
        indexingPolicy: {
            indexingMode: 'consistent',
            automatic: true,
            includedPaths: [{ path: '/*' }],
            excludedPaths: [{ path: '/"_etag"/?' }]
        }
    });
    
    console.log('Container created successfully:', container.id);
}

createContainer().catch(console.error);
