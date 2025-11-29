/**
 * Create api-tracking container for API usage statistics
 * 
 * This container stores daily call counts for 3rd party APIs:
 * - VirusTotal (link scanning)
 * - Auth0 (user management)
 * 
 * Run this script once to create the container:
 * node scripts/create-api-tracking-container.js
 */

import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config({ path: '../apps/api/local.settings.json' });

const endpoint = process.env.COSMOS_ENDPOINT || process.env.Values?.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY || process.env.Values?.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE_NAME || 'somostech';

if (!endpoint || !key) {
    console.error('Missing COSMOS_ENDPOINT or COSMOS_KEY environment variables');
    process.exit(1);
}

const client = new CosmosClient({ endpoint, key });

async function createContainer() {
    try {
        const database = client.database(databaseName);
        
        console.log('Creating api-tracking container...');
        
        const { container } = await database.containers.createIfNotExists({
            id: 'api-tracking',
            partitionKey: { 
                paths: ['/apiName'],
                kind: 'Hash'
            },
            defaultTtl: 90 * 24 * 60 * 60 // 90 days TTL - auto-cleanup old data
        });
        
        console.log('✅ Container created successfully:', container.id);
        console.log('Partition key: /apiName');
        console.log('TTL: 90 days (documents auto-expire after 90 days)');
        
    } catch (error) {
        if (error.code === 409) {
            console.log('✅ Container already exists');
        } else {
            console.error('❌ Error creating container:', error);
            process.exit(1);
        }
    }
}

createContainer();
