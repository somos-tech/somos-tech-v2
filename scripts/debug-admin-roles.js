import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import fs from 'fs';
import path from 'path';

// Load environment variables from local.settings.json if available
function loadLocalSettings() {
    try {
        // Try multiple paths
        const paths = [
            path.resolve('local.settings.json'),
            path.resolve('apps/api/local.settings.json'),
            path.resolve('../apps/api/local.settings.json')
        ];

        let settingsPath = null;
        for (const p of paths) {
            if (fs.existsSync(p)) {
                settingsPath = p;
                break;
            }
        }

        if (settingsPath) {
            console.log(`Loading settings from ${settingsPath}`);
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (settings.Values) {
                Object.entries(settings.Values).forEach(([key, value]) => {
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                });
            }
        } else {
            console.log('local.settings.json not found in common locations');
        }
    } catch (error) {
        console.warn('Failed to load local.settings.json:', error.message);
    }
}

loadLocalSettings();

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE_NAME || 'somostech';
const containerId = 'admin-users';
const targetEmail = process.argv[2] || 'jcruz@somos.tech';

if (!endpoint) {
    console.error('Error: COSMOS_ENDPOINT is not set.');
    process.exit(1);
}

async function main() {
    console.log(`Checking admin roles for: ${targetEmail}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Database: ${databaseId}`);
    console.log(`Container: ${containerId}`);

    let client;
    try {
        if (key) {
            console.log('Using Key authentication');
            client = new CosmosClient({ endpoint, key });
        } else {
            console.log('Using DefaultAzureCredential');
            const credential = new DefaultAzureCredential();
            client = new CosmosClient({ endpoint, aadCredentials: credential });
        }

        const database = client.database(databaseId);
        const container = database.container(containerId);

        const querySpec = {
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [
                {
                    name: '@email',
                    value: targetEmail.toLowerCase()
                }
            ]
        };

        const { resources: users } = await container.items.query(querySpec).fetchAll();

        if (users.length === 0) {
            console.log('\n❌ User NOT FOUND in admin-users container.');
            console.log('Action: You must add this user to the admin-users container manually or via the setup script.');
        } else {
            const user = users[0];
            console.log('\n✅ User FOUND:');
            console.log(JSON.stringify(user, null, 2));

            const roles = user.roles || [];
            if (roles.includes('admin')) {
                console.log('\n✅ User has "admin" role.');
            } else {
                console.log('\n❌ User MISSING "admin" role.');
                console.log(`Current roles: ${JSON.stringify(roles)}`);
            }

            if (user.status === 'active') {
                console.log('✅ User status is "active".');
            } else {
                console.log(`❌ User status is "${user.status}" (expected "active").`);
            }
        }

    } catch (error) {
        console.error('Error querying Cosmos DB:', error);
    }
}

main();
