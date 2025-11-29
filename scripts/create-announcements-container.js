/**
 * Script to create the announcements container in Cosmos DB
 * 
 * Run with: node scripts/create-announcements-container.js
 */

import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './apps/api/local.settings.json' });

const connectionString = process.env.COSMOS_CONNECTION_STRING || 
    process.env.Values?.COSMOS_CONNECTION_STRING;

if (!connectionString) {
    console.error('COSMOS_CONNECTION_STRING not found in environment');
    console.log('Please set it in apps/api/local.settings.json or as an environment variable');
    process.exit(1);
}

const client = new CosmosClient(connectionString);
const databaseId = 'somostech';

async function createContainer() {
    try {
        console.log('Connecting to Cosmos DB...');
        
        const database = client.database(databaseId);
        
        // Create announcements container
        console.log('Creating announcements container...');
        const { container: announcementsContainer } = await database.containers.createIfNotExists({
            id: 'announcements',
            partitionKey: { paths: ['/id'] }
        });
        console.log('✅ Announcements container created/verified');

        // Create email-contacts container if it doesn't exist
        console.log('Creating email-contacts container...');
        const { container: emailContactsContainer } = await database.containers.createIfNotExists({
            id: 'email-contacts',
            partitionKey: { paths: ['/id'] }
        });
        console.log('✅ Email-contacts container created/verified');

        console.log('\n🎉 All containers created successfully!');
        
    } catch (error) {
        console.error('Error creating containers:', error.message);
        process.exit(1);
    }
}

createContainer();
