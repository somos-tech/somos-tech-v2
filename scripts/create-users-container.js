const { CosmosClient } = require('@azure/cosmos');

// Configuration
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE_NAME || 'somostech';
const containerName = 'users';

if (!endpoint || !key) {
  console.error('❌ Error: COSMOS_ENDPOINT and COSMOS_KEY environment variables are required');
  console.log('\nUsage:');
  console.log('  $env:COSMOS_ENDPOINT="your-cosmos-endpoint"');
  console.log('  $env:COSMOS_KEY="your-cosmos-key"');
  console.log('  node create-users-container.js');
  process.exit(1);
}

async function createUsersContainer() {
  console.log('🚀 Creating Cosmos DB users container...\n');
  
  const client = new CosmosClient({ endpoint, key });
  
  try {
    // Get or create database
    console.log(`📦 Database: ${databaseName}`);
    const { database } = await client.databases.createIfNotExists({
      id: databaseName
    });
    console.log('✅ Database ready\n');

    // Create users container
    console.log(`📦 Container: ${containerName}`);
    const containerDef = {
      id: containerName,
      partitionKey: {
        paths: ['/id'],
        version: 2
      },
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [
          { path: '/*' }
        ],
        excludedPaths: [
          { path: '/"_etag"/?'}
        ],
        compositeIndexes: [
          [
            { path: '/status', order: 'ascending' },
            { path: '/createdAt', order: 'descending' }
          ],
          [
            { path: '/email', order: 'ascending' }
          ],
          [
            { path: '/lastLoginAt', order: 'descending' }
          ]
        ]
      },
      uniqueKeyPolicy: {
        uniqueKeys: [
          { paths: ['/email'] }
        ]
      }
    };

    const { container } = await database.containers.createIfNotExists(containerDef);
    console.log('✅ Container created successfully\n');

    // Display container properties
    const { resource: containerProps } = await container.read();
    console.log('📊 Container Configuration:');
    console.log(`   - ID: ${containerProps.id}`);
    console.log(`   - Partition Key: ${containerProps.partitionKey.paths[0]}`);
    console.log(`   - Indexing Mode: ${containerProps.indexingPolicy.indexingMode}`);
    console.log(`   - Unique Keys: email`);
    console.log('\n✅ Users container is ready for user management!\n');

    console.log('📝 Container Features:');
    console.log('   ✓ Partition key on /id for optimal performance');
    console.log('   ✓ Unique constraint on email to prevent duplicates');
    console.log('   ✓ Composite indexes for fast queries by status and date');
    console.log('   ✓ Email index for quick lookups');
    console.log('   ✓ lastLoginAt index for activity tracking\n');

    console.log('🎉 Setup complete! You can now:');
    console.log('   1. Deploy the API functions');
    console.log('   2. Users will be automatically created on first login');
    console.log('   3. Admins can manage users from the admin portal\n');

  } catch (error) {
    console.error('❌ Error creating container:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  }
}

createUsersContainer();
