const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function checkAdminUser() {
    const endpoint = 'https://cosmos-somos-tech-dev-64qb73pzvgekw.documents.azure.com:443/';
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({ endpoint, aadCredentials: credential });
    
    const container = client.database('somostech').container('admin-users');
    
    // Check for jcruz@somos.tech
    const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: 'jcruz@somos.tech' }]
    }).fetchAll();
    
    if (resources.length === 0) {
        console.log('User jcruz@somos.tech NOT found in admin-users container');
        console.log('\nListing all users in admin-users container:');
        const { resources: allUsers } = await container.items.query('SELECT * FROM c').fetchAll();
        console.log(JSON.stringify(allUsers, null, 2));
    } else {
        console.log('User jcruz@somos.tech found:');
        console.log(JSON.stringify(resources, null, 2));
    }
}

checkAdminUser().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
