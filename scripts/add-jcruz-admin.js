const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function addAdminUser() {
    const endpoint = 'https://cosmos-somos-tech-dev-64qb73pzvgekw.documents.azure.com:443/';
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({ endpoint, aadCredentials: credential });
    
    const container = client.database('somostech').container('admin-users');
    
    const email = 'jcruz@somos.tech';
    
    // Check if user already exists
    const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }]
    }).fetchAll();
    
    if (resources.length > 0) {
        console.log('User already exists:');
        console.log(JSON.stringify(resources[0], null, 2));
        
        // Update to ensure active status
        const user = resources[0];
        user.status = 'active';
        user.roles = ['admin', 'authenticated'];
        user.updatedAt = new Date().toISOString();
        
        await container.item(user.id, user.email).replace(user);
        console.log('\n✅ Updated user to active with admin role');
        return;
    }
    
    // Create new admin user
    const newAdminUser = {
        id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: email,
        name: 'Javier Cruz',
        roles: ['admin', 'authenticated'],
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        lastLogin: null
    };
    
    const { resource } = await container.items.create(newAdminUser);
    console.log('✅ Admin user created successfully:');
    console.log(JSON.stringify(resource, null, 2));
}

addAdminUser().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
