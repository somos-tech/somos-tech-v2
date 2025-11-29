/**
 * Fix Deleted Users Script
 * 
 * This script finds users with status='deleted' or displayName='Deleted User'
 * and helps identify or fix them.
 * 
 * Usage:
 *   node fix-deleted-users.js          # List deleted users
 *   node fix-deleted-users.js --fix    # Actually fix them (requires user to re-login)
 */

require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE_ID || 'somostech';

if (!endpoint || !key) {
    console.error('❌ Missing COSMOS_ENDPOINT or COSMOS_KEY in environment');
    process.exit(1);
}

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const usersContainer = database.container('users');

async function findDeletedUsers() {
    console.log('🔍 Searching for deleted users...\n');
    
    // Find users with deleted status or "Deleted User" displayName
    const query = `
        SELECT * FROM c 
        WHERE c.status = 'deleted' 
           OR c.displayName = 'Deleted User' 
           OR STARTSWITH(c.email, 'deleted_')
    `;
    
    const { resources: deletedUsers } = await usersContainer.items.query(query).fetchAll();
    
    if (deletedUsers.length === 0) {
        console.log('✅ No deleted users found!');
        return [];
    }
    
    console.log(`Found ${deletedUsers.length} deleted/marked user(s):\n`);
    
    for (const user of deletedUsers) {
        console.log('─'.repeat(60));
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Original Email: ${user.originalEmail || 'Not stored'}`);
        console.log(`Display Name: ${user.displayName}`);
        console.log(`Status: ${user.status}`);
        console.log(`Deleted At: ${user.deletedAt || 'N/A'}`);
        console.log(`Deleted By: ${user.deletedBy || 'N/A'}`);
        console.log(`Auth0 Deleted: ${user.auth0Deleted || false}`);
        console.log(`Created At: ${user.createdAt}`);
        console.log(`Last Login: ${user.lastLoginAt}`);
    }
    console.log('─'.repeat(60));
    
    return deletedUsers;
}

async function markForReactivation(userId) {
    /**
     * We can't fully "fix" a deleted user without their auth data.
     * But we can clear the "Deleted User" displayName so when they
     * next log in, the getOrCreateUser will properly reactivate them.
     * 
     * The fix is:
     * 1. Ensure status is 'deleted' (not 'active' with bad displayName)
     * 2. When they next login, getOrCreateUser will detect status='deleted'
     *    and properly reactivate with fresh auth data
     */
    const { resource: user } = await usersContainer.item(userId, userId).read();
    
    if (!user) {
        console.log(`❌ User ${userId} not found`);
        return false;
    }
    
    // If user is "active" but has "Deleted User" displayName, something's wrong
    // This means they logged in after deletion but before our fix
    if (user.status === 'active' && user.displayName === 'Deleted User') {
        console.log(`⚠️  User ${userId} is active but has 'Deleted User' displayName`);
        console.log(`   This user logged in after deletion before the fix was deployed.`);
        console.log(`   Setting status back to 'deleted' so next login triggers reactivation.`);
        
        await usersContainer.items.upsert({
            ...user,
            status: 'deleted',
            needsReactivation: true,
            fixedAt: new Date().toISOString()
        });
        
        console.log(`✅ User marked for reactivation. They need to log out and log back in.`);
        return true;
    }
    
    console.log(`ℹ️  User ${userId} has status='${user.status}'. Will be reactivated on next login.`);
    return false;
}

async function main() {
    const args = process.argv.slice(2);
    const shouldFix = args.includes('--fix');
    
    try {
        const deletedUsers = await findDeletedUsers();
        
        if (deletedUsers.length > 0 && shouldFix) {
            console.log('\n🔧 Fixing users marked for reactivation...\n');
            
            for (const user of deletedUsers) {
                await markForReactivation(user.id);
            }
            
            console.log('\n✅ Done! Users with status="deleted" will be reactivated on next login.');
            console.log('   They will get their proper name/email from their auth provider.');
        } else if (deletedUsers.length > 0) {
            console.log('\n💡 To fix these users, run: node fix-deleted-users.js --fix');
            console.log('   After fixing, users need to log out and log back in.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
