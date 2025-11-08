const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function addFirstAdmin() {
    const endpoint = 'https://cosmos-somos-tech-dev-64qb73pzvgekw.documents.azure.com:443/';
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({ endpoint, aadCredentials: credential });
    
    const container = client.database('somostech').container('admin-users');
    
    const adminEmail = 'jcruz@somos.tech';
    
    // Check if user already exists
    const { resources: existingUsers } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: adminEmail }]
    }).fetchAll();
    
    if (existingUsers.length > 0) {
        console.log('✅ User already exists:', existingUsers[0]);
        console.log('Current roles:', existingUsers[0].roles);
        
        // Update to ensure admin role
        const user = existingUsers[0];
        if (!user.roles.includes('admin')) {
            user.roles.push('admin');
            user.updatedAt = new Date().toISOString();
            user.updatedBy = 'system-script';
            
            const { resource: updated } = await container.item(user.id, user.email).replace(user);
            console.log('✅ Updated user with admin role:', updated);
        }
        return;
    }
    
    // Create new admin user
    const newAdminUser = {
        id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: adminEmail,
        name: 'Jose Cruz',
        roles: ['admin', 'authenticated'],
        status: 'active',
        identityProvider: 'aad',
        createdAt: new Date().toISOString(),
        createdBy: 'system-script',
        lastLogin: null
    };
    
    const { resource: created } = await container.items.create(newAdminUser);
    console.log('✅ Successfully created first admin user:');
    console.log(JSON.stringify(created, null, 2));
}

addFirstAdmin().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
