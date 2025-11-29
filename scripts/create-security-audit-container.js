const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function createSecurityAuditContainer() {
    try {
        console.log('Initializing Azure credentials...');
        const endpoint = 'https://cosmos-somos-tech-dev-64qb73pzvgekw.documents.azure.com:443/';
        const credential = new DefaultAzureCredential();
        const client = new CosmosClient({ endpoint, aadCredentials: credential });
        
        console.log('Connecting to database...');
        const database = client.database('somostech');
        
        console.log('Creating security-audit container...');
        
        // Create the container with TTL enabled (90 days retention)
        const { container } = await database.containers.createIfNotExists({
            id: 'security-audit',
            partitionKey: {
                paths: ['/type'],
                kind: 'Hash'
            },
            defaultTtl: 7776000, // 90 days in seconds
            indexingPolicy: {
                indexingMode: 'consistent',
                automatic: true,
                includedPaths: [
                    { path: '/*' }
                ],
                excludedPaths: [
                    { path: '/details/*' }
                ]
            }
        });
        
        console.log('✅ Security-audit container created successfully!');
        console.log('Container ID:', container.id);
        console.log('TTL: 90 days');
        
        // Create a test event to verify
        const testEvent = {
            id: `security-${Date.now()}-init`,
            type: 'security_audit_initialized',
            timestamp: new Date().toISOString(),
            details: {
                message: 'Security audit system initialized',
                initializedBy: 'system'
            }
        };
        
        await container.items.create(testEvent);
        console.log('✅ Initial security event logged!');
        console.log('\n✅ Security audit system is ready.');
        
    } catch (error) {
        console.error('❌ Error details:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 409) {
            console.log('\nℹ️  Security-audit container already exists - this is OK!');
            return;
        }
        throw error;
    }
}

createSecurityAuditContainer()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch(e => {
        console.error('\n❌ Script failed:', e.message);
        process.exit(1);
    });
