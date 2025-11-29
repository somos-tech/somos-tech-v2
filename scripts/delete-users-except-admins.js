/**
 * Delete all users from Cosmos DB except for specified admin emails
 */

const { CosmosClient } = require('@azure/cosmos');

const KEEP_EMAILS = [
    'jcruz@somos.tech',
    'fserna@somos.tech'
];

async function main() {
    // Get connection string from environment or use the one from local.settings.json
    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    
    if (!connectionString) {
        console.error('COSMOS_CONNECTION_STRING environment variable is required');
        console.log('Set it with: $env:COSMOS_CONNECTION_STRING = "your-connection-string"');
        process.exit(1);
    }

    const client = new CosmosClient(connectionString);
    const database = client.database('somostech');
    const container = database.container('users');

    console.log('Fetching all users...');
    
    // Query all users
    const { resources: users } = await container.items
        .query('SELECT * FROM c')
        .fetchAll();

    console.log(`Found ${users.length} users total`);

    // Filter users to delete
    const usersToDelete = users.filter(user => 
        !KEEP_EMAILS.includes(user.email?.toLowerCase())
    );

    const usersToKeep = users.filter(user => 
        KEEP_EMAILS.includes(user.email?.toLowerCase())
    );

    console.log('\nUsers to KEEP:');
    usersToKeep.forEach(user => console.log(`  ✓ ${user.email} (id: ${user.id})`));

    console.log('\nUsers to DELETE:');
    usersToDelete.forEach(user => console.log(`  ✗ ${user.email} (id: ${user.id})`));

    if (usersToDelete.length === 0) {
        console.log('\nNo users to delete.');
        return;
    }

    console.log(`\nDeleting ${usersToDelete.length} users...`);

    let deleted = 0;
    let failed = 0;

    for (const user of usersToDelete) {
        try {
            // Cosmos DB requires partition key for delete - try with id as partition key
            await container.item(user.id, user.id).delete();
            console.log(`  Deleted: ${user.email || user.displayName || user.id}`);
            deleted++;
        } catch (error) {
            // If that fails, try without partition key (undefined)
            try {
                await container.item(user.id).delete();
                console.log(`  Deleted (2nd attempt): ${user.email || user.displayName || user.id}`);
                deleted++;
            } catch (error2) {
                console.error(`  Failed to delete ${user.email || user.displayName || user.id}: ${error2.message.split(',')[0]}`);
                failed++;
            }
        }
    }

    console.log(`\nDone! Deleted: ${deleted}, Failed: ${failed}`);
}

main().catch(console.error);
