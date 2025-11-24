
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from local.settings.json
const settingsPath = path.join(__dirname, '../apps/api/local.settings.json');
if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.Values) {
        Object.assign(process.env, settings.Values);
    }
}

// Mock Azure Functions context
const context = {
    log: (...args) => console.log('[LOG]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
};
context.log.error = context.error;

// Import the DB module after setting env vars
// We need to use dynamic import to ensure env vars are set first
async function runDebug() {
    console.log('--- Starting Admin Logic Debug ---');
    console.log(`Endpoint: ${process.env.COSMOS_ENDPOINT}`);
    
    try {
        const { getContainer } = await import('../apps/api/shared/db.js');
        
        const email = 'jcruz@somos.tech';
        const containerId = 'admin-users';
        const allowedDomain = process.env.ALLOWED_ADMIN_DOMAIN || 'somos.tech';

        console.log(`Checking logic for user: ${email}`);
        console.log(`Allowed domain: ${allowedDomain}`);

        // 1. Domain Check
        if (!email.endsWith(`@${allowedDomain}`)) {
            console.error('FAIL: Email domain check failed.');
            return;
        }
        console.log('PASS: Email domain check passed.');

        // 2. DB Query
        console.log('Querying Cosmos DB...');
        const container = getContainer(containerId);
        
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [{ name: '@email', value: email }]
        };

        const { resources: adminUsers } = await container.items.query(querySpec).fetchAll();
        
        console.log(`Found ${adminUsers.length} admin user records.`);

        let roles = ['authenticated']; // Base role

        if (adminUsers.length > 0) {
            const adminUser = adminUsers[0];
            console.log('User Record:', JSON.stringify(adminUser, null, 2));
            
            if (adminUser.roles && Array.isArray(adminUser.roles)) {
                roles.push(...adminUser.roles);
                console.log(`Added roles from DB: ${adminUser.roles.join(', ')}`);
            } else {
                roles.push('admin');
                console.log('Added default admin role (no roles in DB).');
            }
        } else {
            console.log('User not found in DB. Logic would auto-register.');
            roles.push('admin');
        }

        const uniqueRoles = [...new Set(roles)];
        console.log('--- Final Calculated Roles ---');
        console.log(JSON.stringify(uniqueRoles, null, 2));

        if (uniqueRoles.includes('admin')) {
            console.log('\nSUCCESS: Logic correctly assigns ADMIN role.');
        } else {
            console.error('\nFAILURE: Logic did NOT assign ADMIN role.');
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    }
}

runDebug();
