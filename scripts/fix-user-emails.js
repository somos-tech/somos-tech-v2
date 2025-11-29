/**
 * Fix User Emails Script
 * 
 * This script fixes users in the Cosmos DB where the email field
 * was incorrectly set to the display name or nickname instead of 
 * the actual email address.
 * 
 * Run with: node scripts/fix-user-emails.js
 */

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import fs from 'fs';

// Try to parse local.settings.json for Cosmos endpoint
let cosmosEndpoint;
let databaseName = 'somostech';

try {
    const settings = JSON.parse(fs.readFileSync('apps/api/local.settings.json', 'utf8'));
    cosmosEndpoint = settings.Values?.COSMOS_ENDPOINT;
    databaseName = settings.Values?.COSMOS_DATABASE_NAME || databaseName;
} catch (e) {
    console.error('Could not load local.settings.json:', e.message);
}

if (!cosmosEndpoint) {
    console.error('COSMOS_ENDPOINT not found in local.settings.json');
    process.exit(1);
}

console.log(`Connecting to Cosmos DB at ${cosmosEndpoint}...`);

// Use DefaultAzureCredential for authentication
const credential = new DefaultAzureCredential();
const client = new CosmosClient({ endpoint: cosmosEndpoint, aadCredentials: credential });
const database = client.database(databaseName);
const container = database.container('users');

async function fixUserEmails() {
    console.log('Fetching all users...\n');
    
    const { resources: users } = await container.items
        .query('SELECT * FROM c ORDER BY c.createdAt DESC')
        .fetchAll();
    
    console.log(`Found ${users.length} users\n`);
    console.log('Checking for email issues...\n');
    
    const usersToFix = [];
    
    for (const user of users) {
        const email = user.email;
        const displayName = user.displayName;
        const id = user.id;
        
        // Check if email doesn't look like an email
        const looksLikeEmail = email && email.includes('@');
        
        console.log(`User: ${displayName}`);
        console.log(`  ID: ${id}`);
        console.log(`  Email: ${email}`);
        console.log(`  Provider: ${user.authProvider}`);
        console.log(`  Valid email: ${looksLikeEmail ? 'Yes' : 'NO - NEEDS FIX'}`);
        
        if (!looksLikeEmail) {
            usersToFix.push({
                user,
                issue: 'Email field does not contain valid email'
            });
        }
        
        console.log('');
    }
    
    console.log('='.repeat(60));
    console.log(`\nSummary: ${usersToFix.length} users need email fixes\n`);
    
    if (usersToFix.length > 0) {
        console.log('Users needing fixes:');
        for (const { user, issue } of usersToFix) {
            console.log(`  - ${user.displayName} (${user.id}): ${issue}`);
            console.log(`    Current email value: "${user.email}"`);
            
            // Try to find a valid email in metadata or other fields
            if (user.metadata?.originalEmail) {
                console.log(`    Found originalEmail in metadata: ${user.metadata.originalEmail}`);
            }
        }
        
        // Check if --fix flag was passed
        const shouldFix = process.argv.includes('--fix');
        
        if (shouldFix) {
            console.log('\n' + '='.repeat(60));
            console.log('\nApplying fixes...\n');
            
            // Manual email mappings for known users
            // These need to be verified manually before running
            const emailMappings = {
                'google-oauth2|106122817788273256363': null, // SOMOS Tech - need actual email
                'google-oauth2|113741660019437618851': null, // Joey tester - need actual email
            };
            
            for (const { user } of usersToFix) {
                const correctEmail = emailMappings[user.id];
                if (correctEmail) {
                    console.log(`Updating ${user.displayName} email to: ${correctEmail}`);
                    try {
                        const updatedUser = {
                            ...user,
                            email: correctEmail.toLowerCase(),
                            updatedAt: new Date().toISOString(),
                            metadata: {
                                ...user.metadata,
                                emailFixed: true,
                                previousEmail: user.email,
                                emailFixedAt: new Date().toISOString()
                            }
                        };
                        await container.item(user.id, user.id).replace(updatedUser);
                        console.log(`  ✓ Fixed successfully`);
                    } catch (e) {
                        console.log(`  ✗ Error: ${e.message}`);
                    }
                } else {
                    console.log(`Skipping ${user.displayName} - no email mapping defined`);
                }
            }
        } else {
            console.log('\n' + '='.repeat(60));
            console.log('\nTo fix these users:');
            console.log('1. Have the affected users log in again (the fix is deployed)');
            console.log('2. Or add email mappings to this script and run with --fix');
            console.log('\nThe syncUserProfile endpoint will now correctly extract emails from Auth0 claims.');
        }
    }
}

// Run the script
fixUserEmails().catch(console.error);
