/**
 * Create the broadcasts container in Cosmos DB
 * Run: node scripts/create-broadcasts-container.js
 */

const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const endpoint = process.env.COSMOS_ENDPOINT || process.env.REACT_APP_COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY || process.env.REACT_APP_COSMOS_KEY;
const databaseId = 'somostech';
const containerId = 'broadcasts';

async function createBroadcastsContainer() {
    if (!endpoint || !key) {
        console.error('❌ Missing COSMOS_ENDPOINT or COSMOS_KEY environment variables');
        console.log('Set these in your .env file or environment');
        process.exit(1);
    }

    console.log('🚀 Creating broadcasts container...\n');

    const client = new CosmosClient({ endpoint, key });
    const database = client.database(databaseId);

    try {
        // Create the container with partition key on /id
        const { container } = await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: { paths: ['/id'] },
            indexingPolicy: {
                automatic: true,
                indexingMode: 'consistent',
                includedPaths: [{ path: '/*' }],
                excludedPaths: [{ path: '/"_etag"/?' }]
            }
        });

        console.log(`✅ Container "${containerId}" created/verified in database "${databaseId}"`);
        console.log('\n📊 Container Details:');
        console.log(`   - Partition Key: /id`);
        console.log(`   - Database: ${databaseId}`);
        console.log(`   - Container: ${containerId}`);

        // Verify by reading container properties
        const { resource: containerInfo } = await container.read();
        console.log(`   - Self Link: ${containerInfo._self}`);

        console.log('\n✅ Broadcasts container is ready!');

    } catch (error) {
        console.error('❌ Error creating container:', error.message);
        process.exit(1);
    }
}

createBroadcastsContainer();
