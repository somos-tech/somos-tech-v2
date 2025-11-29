/**
 * Create Cosmos DB containers for Announcements and Email Subscriptions
 * 
 * Containers:
 * - announcements: Store announcement drafts and sent history
 * - email-contacts: Store email contacts and subscription preferences
 * 
 * Usage: node scripts/create-announcements-containers.js
 */

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

// Read from local.settings.json or environment
let cosmosEndpoint;
let databaseName = 'somostech';

try {
    const fs = await import('fs');
    const settings = JSON.parse(fs.readFileSync('./apps/api/local.settings.json', 'utf8'));
    cosmosEndpoint = settings.Values?.COSMOS_ENDPOINT;
    databaseName = settings.Values?.COSMOS_DATABASE_NAME || databaseName;
} catch (e) {
    cosmosEndpoint = process.env.COSMOS_ENDPOINT;
    databaseName = process.env.COSMOS_DATABASE_NAME || databaseName;
}

if (!cosmosEndpoint) {
    console.error('❌ COSMOS_ENDPOINT not found');
    process.exit(1);
}

console.log(`📡 Connecting to Cosmos DB at ${cosmosEndpoint}...`);

const credential = new DefaultAzureCredential();
const client = new CosmosClient({ endpoint: cosmosEndpoint, aadCredentials: credential });
const database = client.database(databaseName);

const containers = [
    {
        id: 'announcements',
        partitionKey: { paths: ['/id'], kind: 'Hash' },
        indexingPolicy: {
            automatic: true,
            indexingMode: 'consistent',
            includedPaths: [
                { path: '/status/?' },
                { path: '/type/?' },
                { path: '/createdAt/?' },
                { path: '/sentAt/?' },
                { path: '/isPublic/?' }
            ],
            excludedPaths: [
                { path: '/content/*' },
                { path: '/"_etag"/?' }
            ]
        }
    },
    {
        id: 'email-contacts',
        partitionKey: { paths: ['/id'], kind: 'Hash' },
        uniqueKeyPolicy: {
            uniqueKeys: [
                { paths: ['/email'] }
            ]
        },
        indexingPolicy: {
            automatic: true,
            indexingMode: 'consistent',
            includedPaths: [
                { path: '/email/?' },
                { path: '/status/?' },
                { path: '/source/?' },
                { path: '/linkedUserId/?' },
                { path: '/subscriptions/newsletters/?' },
                { path: '/subscriptions/events/?' },
                { path: '/subscriptions/announcements/?' },
                { path: '/createdAt/?' }
            ],
            excludedPaths: [
                { path: '/"_etag"/?' }
            ]
        }
    }
];

async function createContainers() {
    console.log('🚀 Creating Cosmos DB containers for Announcements...\n');
    
    for (const containerDef of containers) {
        try {
            console.log(`📦 Creating container: ${containerDef.id}`);
            
            const { container, resource } = await database.containers.createIfNotExists({
                id: containerDef.id,
                partitionKey: containerDef.partitionKey,
                uniqueKeyPolicy: containerDef.uniqueKeyPolicy,
                indexingPolicy: containerDef.indexingPolicy,
                throughput: 400 // Minimum RU/s for serverless
            });
            
            if (resource) {
                console.log(`   ✅ Container created: ${containerDef.id}`);
            } else {
                console.log(`   ℹ️  Container already exists: ${containerDef.id}`);
            }
            
        } catch (error) {
            if (error.code === 409) {
                console.log(`   ℹ️  Container already exists: ${containerDef.id}`);
            } else {
                console.error(`   ❌ Error creating ${containerDef.id}:`, error.message);
            }
        }
    }
    
    console.log('\n✨ Container setup complete!');
    console.log('\nNext steps:');
    console.log('1. Deploy the API: npm run deploy:api');
    console.log('2. Test the endpoints:');
    console.log('   - GET /api/announcements');
    console.log('   - POST /api/announcements');
    console.log('   - GET /api/email/contacts');
}

createContainers().catch(console.error);
