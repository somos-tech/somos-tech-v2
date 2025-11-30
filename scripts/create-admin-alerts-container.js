/**
 * Create admin-alerts container for dashboard alerts
 * 
 * This container stores alerts from:
 * - API health check failures
 * - Security anomalies
 * - System events
 * 
 * Run this script once to create the container:
 * node scripts/create-admin-alerts-container.js
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
        
        console.log('Creating admin-alerts container...');
        
        const { container } = await database.containers.createIfNotExists({
            id: 'admin-alerts',
            partitionKey: { 
                paths: ['/partitionKey'],
                kind: 'Hash'
            },
            defaultTtl: 30 * 24 * 60 * 60 // 30 days TTL - auto-cleanup old alerts
        });
        
        console.log('✅ Container created successfully:', container.id);
        console.log('Partition key: /partitionKey');
        console.log('TTL: 30 days (documents auto-expire after 30 days)');
        
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
