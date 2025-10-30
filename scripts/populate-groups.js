/**
 * Script to populate Cosmos DB with initial groups
 * Run this script to create the groups container and add initial data
 * 
 * Usage: node scripts/populate-groups.js
 * 
 * Prerequisites:
 * - Azure CLI logged in (az login)
 * - Proper permissions to access Cosmos DB
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

// Configuration from Cosmos DB details
const endpoint = process.env.COSMOS_ENDPOINT || 'https://cosmos-somos-tech-dev-64qb73pzvgekw.documents.azure.com:443/';
const databaseId = process.env.COSMOS_DATABASE_NAME || 'somostech';
const containerId = 'groups';

// Use DefaultAzureCredential for authentication (works with Azure CLI, Managed Identity, etc.)
const credential = new DefaultAzureCredential();
const client = new CosmosClient({ endpoint, aadCredentials: credential });

// Initial groups data based on the provided image
const initialGroups = [
    {
        id: 'group-seattle',
        name: 'Seattle, WA',
        city: 'Seattle',
        state: 'WA',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1542223092-2f54de6d96e7?w=400',
        description: 'Seattle tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-newyork',
        name: 'New York, NY',
        city: 'New York',
        state: 'NY',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400',
        description: 'New York tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-boston',
        name: 'Boston, MA',
        city: 'Boston',
        state: 'MA',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1617440168937-e6b5e8a4b28f?w=400',
        description: 'Boston tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-denver',
        name: 'Denver, CO',
        city: 'Denver',
        state: 'CO',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1619856699906-09e1f58c98b1?w=400',
        description: 'Denver tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-washingtondc',
        name: 'Washington DC',
        city: 'Washington',
        state: 'DC',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=400',
        description: 'Washington DC tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-atlanta',
        name: 'Atlanta, GA',
        city: 'Atlanta',
        state: 'GA',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1526883669592-2b11f8c60a3b?w=400',
        description: 'Atlanta tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-sanfrancisco',
        name: 'San Francisco, CA',
        city: 'San Francisco',
        state: 'CA',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=400',
        description: 'San Francisco tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-chicago',
        name: 'Chicago, IL',
        city: 'Chicago',
        state: 'IL',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400',
        description: 'Chicago tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-austin',
        name: 'Austin, TX',
        city: 'Austin',
        state: 'TX',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=400',
        description: 'Austin tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-houston',
        name: 'Houston, TX',
        city: 'Houston',
        state: 'TX',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1558525107-b9b347fe9da5?w=400',
        description: 'Houston tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-losangeles',
        name: 'Los Angeles, CA',
        city: 'Los Angeles',
        state: 'CA',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=400',
        description: 'Los Angeles tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-virtualevents',
        name: 'Virtual Events',
        city: 'Virtual',
        state: 'Events',
        visibility: 'Hidden',
        imageUrl: 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=400',
        description: 'Online virtual events and webinars',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-miami',
        name: 'Miami, FL',
        city: 'Miami',
        state: 'FL',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=400',
        description: 'Miami tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-labbuilder',
        name: 'Lab builder',
        city: 'Lab',
        state: 'builder',
        visibility: 'Hidden',
        imageUrl: 'https://images.unsplash.com/photo-1581093458791-9d42e2d2c3f9?w=400',
        description: 'Innovation lab and workspace',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-testlanding',
        name: 'test-landing',
        city: 'test',
        state: 'landing',
        visibility: 'Hidden',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
        description: 'Test landing page',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-mentees',
        name: 'Mentees',
        city: 'Mentees',
        state: '',
        visibility: 'Hidden',
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400',
        description: 'Mentorship program participants',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-startingintech',
        name: 'Starting in tech',
        city: 'Starting',
        state: 'in tech',
        visibility: 'Hidden',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
        description: 'Resources for tech career beginners',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-dallas',
        name: 'Dallas, TX',
        city: 'Dallas',
        state: 'TX',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1580925773052-cf6225e60825?w=400',
        description: 'Dallas tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-phoenix',
        name: 'Phoenix, AZ',
        city: 'Phoenix',
        state: 'AZ',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1518904091050-6c27a0b73d90?w=400',
        description: 'Phoenix tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-sandiego',
        name: 'San Diego, CA',
        city: 'San Diego',
        state: 'CA',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1583582720842-5e5e79d4f0e4?w=400',
        description: 'San Diego tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-philadelphia',
        name: 'Philadelphia, PA',
        city: 'Philadelphia',
        state: 'PA',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1565843708714-52ecf69ab81f?w=400',
        description: 'Philadelphia tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-sacramento',
        name: 'Sacramento, CA',
        city: 'Sacramento',
        state: 'CA',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1590859808308-3d2d9c515b1a?w=400',
        description: 'Sacramento tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'group-dallasftworth',
        name: 'Dallas/Ft. Worth, TX',
        city: 'Dallas/Ft. Worth',
        state: 'TX',
        visibility: 'Public',
        imageUrl: 'https://images.unsplash.com/photo-1552057426-c4d3f5f6d1f6?w=400',
        description: 'Dallas/Fort Worth tech community chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

async function createContainerAndPopulate() {
    try {
        console.log('Connecting to Cosmos DB...');
        const database = client.database(databaseId);

        // Create container if it doesn't exist
        console.log(`Creating container: ${containerId}`);
        const { container } = await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: {
                paths: ['/id']
            }
        });

        console.log(`Container '${containerId}' created or already exists`);

        // Insert groups
        console.log('\nInserting groups...');
        let successCount = 0;
        let errorCount = 0;

        for (const group of initialGroups) {
            try {
                await container.items.create(group);
                console.log(`✓ Created group: ${group.name} (${group.city}, ${group.state})`);
                successCount++;
            } catch (error) {
                if (error.code === 409) {
                    console.log(`- Group already exists: ${group.name}`);
                } else {
                    console.error(`✗ Error creating group ${group.name}:`, error.message);
                    errorCount++;
                }
            }
        }

        console.log('\n=== Summary ===');
        console.log(`Total groups: ${initialGroups.length}`);
        console.log(`Successfully created: ${successCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Already existed: ${initialGroups.length - successCount - errorCount}`);
        console.log('\nDone! Groups container is ready.');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run the script
createContainerAndPopulate();
