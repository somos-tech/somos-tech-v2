/**
 * Fix Container Access Levels
 * 
 * This script updates the access level for Azure Blob Storage containers
 * that need public blob access (for profile photos, group images, etc.)
 * 
 * Run with: node scripts/fix-container-access.js
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

// Containers that need public blob access
const PUBLIC_CONTAINERS = [
    'site-assets',
    'profile-photos',
    'group-images',
    'event-images'
];

async function getConnectionString() {
    // Try environment variable first
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
        return process.env.AZURE_STORAGE_CONNECTION_STRING;
    }
    
    // Try to read from local.settings.json
    const settingsPath = path.join(__dirname, '..', 'apps', 'api', 'local.settings.json');
    try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.Values?.AZURE_STORAGE_CONNECTION_STRING) {
            return settings.Values.AZURE_STORAGE_CONNECTION_STRING;
        }
    } catch (e) {
        console.error('Could not read local.settings.json:', e.message);
    }
    
    return null;
}

async function fixContainerAccess() {
    const connectionString = await getConnectionString();
    
    if (!connectionString) {
        console.error('AZURE_STORAGE_CONNECTION_STRING not found');
        console.log('\nPlease set the connection string:');
        console.log('  $env:AZURE_STORAGE_CONNECTION_STRING="your-connection-string"');
        console.log('\nOr ensure apps/api/local.settings.json has the connection string configured');
        process.exit(1);
    }
    
    console.log('Connecting to Azure Blob Storage...\n');
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    for (const containerName of PUBLIC_CONTAINERS) {
        try {
            const containerClient = blobServiceClient.getContainerClient(containerName);
            
            // Check if container exists
            const exists = await containerClient.exists();
            if (!exists) {
                console.log(`Container '${containerName}' does not exist, skipping...`);
                continue;
            }
            
            // Get current access level
            const accessPolicy = await containerClient.getAccessPolicy();
            const currentAccess = accessPolicy.blobPublicAccess || 'private';
            
            if (currentAccess === 'blob') {
                console.log(`✓ Container '${containerName}' already has public blob access`);
            } else {
                console.log(`Updating '${containerName}' from '${currentAccess}' to 'blob' access...`);
                await containerClient.setAccessPolicy('blob');
                console.log(`✓ Container '${containerName}' updated to public blob access`);
            }
        } catch (error) {
            console.error(`✗ Error updating '${containerName}':`, error.message);
        }
    }
    
    console.log('\nDone! Containers should now be publicly accessible.');
    console.log('Note: It may take a few minutes for the changes to propagate.');
}

fixContainerAccess().catch(console.error);
