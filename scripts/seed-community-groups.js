/**
 * Seed Community Groups
 * 
 * Creates the initial community groups for SOMOS.tech platform
 * based on major US cities with Latino tech communities.
 * 
 * Run with: node scripts/seed-community-groups.js
 * 
 * @author SOMOS.tech
 */

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

// Configuration
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT || 'https://cosmos-somos-tech-dev-64qb73pzvgekw.documents.azure.com:443/';
const DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'somostech';
const CONTAINER_NAME = 'community-groups';

// Unsplash city images (royalty-free)
const cityImages = {
    'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&h=400&fit=crop',
    'Seattle': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&h=400&fit=crop',
    'Houston': 'https://images.unsplash.com/photo-1530089711124-9ca31fb9e863?w=800&h=400&fit=crop',
    'Denver': 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&h=400&fit=crop',
    'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=400&fit=crop',
    'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=400&fit=crop',
    'Boston': 'https://images.unsplash.com/photo-1501979376754-2ff867a4f659?w=800&h=400&fit=crop',
    'Washington DC': 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&h=400&fit=crop',
    'Atlanta': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800&h=400&fit=crop',
    'San Francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=400&fit=crop',
    'Austin': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&h=400&fit=crop',
    'Miami': 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800&h=400&fit=crop',
    'Dallas': 'https://images.unsplash.com/photo-1545194445-dddb8f4487c6?w=800&h=400&fit=crop',
    'Phoenix': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
    'San Diego': 'https://images.unsplash.com/photo-1538097304804-2a1b932466a9?w=800&h=400&fit=crop',
    'Philadelphia': 'https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?w=800&h=400&fit=crop',
    'Sacramento': 'https://images.unsplash.com/photo-1621570074981-ee6b6bd3c0c3?w=800&h=400&fit=crop',
    'Dallas/Ft. Worth': 'https://images.unsplash.com/photo-1570089858967-d6c1a0a3e2e0?w=800&h=400&fit=crop',
    'Puerto Rico': 'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=800&h=400&fit=crop',
    'Milwaukee': 'https://images.unsplash.com/photo-1569530593440-e1dc23b00e71?w=800&h=400&fit=crop'
};

// Community groups data from the screenshot
const communityGroups = [
    { city: 'Chicago', state: 'IL' },
    { city: 'Seattle', state: 'WA' },
    { city: 'Houston', state: 'TX' },
    { city: 'Denver', state: 'CO' },
    { city: 'Los Angeles', state: 'CA' },
    { city: 'New York', state: 'NY' },
    { city: 'Boston', state: 'MA' },
    { city: 'Washington DC', state: 'DC' },
    { city: 'Atlanta', state: 'GA' },
    { city: 'San Francisco', state: 'CA' },
    { city: 'Austin', state: 'TX' },
    { city: 'Miami', state: 'FL' },
    { city: 'Dallas', state: 'TX' },
    { city: 'Phoenix', state: 'AZ' },
    { city: 'San Diego', state: 'CA' },
    { city: 'Philadelphia', state: 'PA' },
    { city: 'Sacramento', state: 'CA' },
    { city: 'Dallas/Ft. Worth', state: 'TX' },
    { city: 'Puerto Rico', state: 'PR' },
    { city: 'Milwaukee', state: 'WI' }
];

/**
 * Generate URL-friendly slug
 */
function generateSlug(city, state) {
    return `${city}-${state}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Create a group document
 */
function createGroupDocument(cityData, index) {
    const { city, state } = cityData;
    const slug = generateSlug(city, state);
    
    return {
        id: `group-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${city}, ${state}`,
        city,
        state,
        slug,
        visibility: 'Public',
        imageUrl: cityImages[city] || 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=400&fit=crop',
        thumbnailUrl: (cityImages[city] || 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df').replace('w=800&h=400', 'w=200&h=200'),
        description: `Welcome to the ${city}, ${state} SOMOS community! Connect with Latino tech professionals in your area, share opportunities, and grow together.`,
        memberCount: 0,
        timezone: getTimezone(state),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
    };
}

/**
 * Get timezone for state
 */
function getTimezone(state) {
    const timezones = {
        'WA': 'America/Los_Angeles',
        'CA': 'America/Los_Angeles',
        'AZ': 'America/Phoenix',
        'CO': 'America/Denver',
        'TX': 'America/Chicago',
        'IL': 'America/Chicago',
        'WI': 'America/Chicago',
        'GA': 'America/New_York',
        'FL': 'America/New_York',
        'NY': 'America/New_York',
        'MA': 'America/New_York',
        'DC': 'America/New_York',
        'PA': 'America/New_York',
        'PR': 'America/Puerto_Rico'
    };
    return timezones[state] || 'America/New_York';
}

/**
 * Main seeding function
 */
async function seedCommunityGroups() {
    console.log('🌱 Starting community groups seeding...\n');

    try {
        // Initialize Cosmos client with DefaultAzureCredential
        const credential = new DefaultAzureCredential();
        const client = new CosmosClient({ endpoint: COSMOS_ENDPOINT, aadCredentials: credential });

        // Get database and container
        const database = client.database(DATABASE_NAME);
        const container = database.container(CONTAINER_NAME);

        // Check if container exists, create if not
        console.log(`📦 Checking container: ${CONTAINER_NAME}`);
        try {
            await container.read();
            console.log('   Container exists');
        } catch (error) {
            if (error.code === 404) {
                console.log('   Creating container...');
                await database.containers.createIfNotExists({
                    id: CONTAINER_NAME,
                    partitionKey: { paths: ['/id'] }
                });
                console.log('   Container created');
            } else {
                throw error;
            }
        }

        // Check existing groups
        const { resources: existingGroups } = await container.items
            .query('SELECT c.city, c.state FROM c')
            .fetchAll();

        const existingCities = new Set(existingGroups.map(g => `${g.city}-${g.state}`));
        console.log(`\n📊 Found ${existingGroups.length} existing groups`);

        // Create groups
        let created = 0;
        let skipped = 0;

        for (let i = 0; i < communityGroups.length; i++) {
            const cityData = communityGroups[i];
            const key = `${cityData.city}-${cityData.state}`;

            if (existingCities.has(key)) {
                console.log(`   ⏭️  Skipping ${cityData.city}, ${cityData.state} (already exists)`);
                skipped++;
                continue;
            }

            const groupDoc = createGroupDocument(cityData, i);
            
            try {
                await container.items.create(groupDoc);
                console.log(`   ✅ Created: ${cityData.city}, ${cityData.state}`);
                created++;
            } catch (error) {
                console.error(`   ❌ Error creating ${cityData.city}, ${cityData.state}:`, error.message);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n📈 Summary:');
        console.log(`   Created: ${created}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Total: ${created + skipped + existingGroups.length}`);
        console.log('\n✨ Seeding complete!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

// Run seeding
seedCommunityGroups();
