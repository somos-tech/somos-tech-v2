const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function createNotificationsContainer() {
    try {
        console.log('Initializing Azure credentials...');
        const endpoint = 'https://cosmos-somos-tech-dev-64qb73pzvgekw.documents.azure.com:443/';
        const credential = new DefaultAzureCredential();
        const client = new CosmosClient({ endpoint, aadCredentials: credential });
        
        console.log('Connecting to database...');
        const database = client.database('somostech');
        
        console.log('Creating notifications container...');
        
        // Create the container
        const { container } = await database.containers.createIfNotExists({
            id: 'notifications',
            partitionKey: {
                paths: ['/type'],
                kind: 'Hash'
            },
            indexingPolicy: {
                indexingMode: 'consistent',
                automatic: true,
                includedPaths: [
                    { path: '/*' }
                ]
            }
        });
        
        console.log('✅ Notifications container created successfully!');
        console.log('Container ID:', container.id);
        
        // Create a test notification
        const testNotification = {
            id: `notif-${Date.now()}-test`,
            type: 'system',
            title: 'Welcome to Notifications',
            message: 'The notification system has been successfully configured!',
            severity: 'success',
            read: false,
            recipientEmail: 'jcruz@somos.tech',
            createdAt: new Date().toISOString(),
            createdBy: 'system'
        };
        
        await container.items.create(testNotification);
        console.log('✅ Test notification created!');
        console.log('\n✅ Setup complete! You can now use the notification system.');
        
    } catch (error) {
        console.error('❌ Error details:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Stack:', error.stack);
        
        if (error.code === 409) {
            console.log('\nℹ️  Notifications container already exists - this is OK!');
            return;
        }
        throw error;
    }
}

createNotificationsContainer()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch(e => {
        console.error('\n❌ Script failed:', e.message);
        process.exit(1);
    });
