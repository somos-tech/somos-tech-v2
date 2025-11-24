
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import relative to this script using file URL
const authMiddlewarePath = path.join(__dirname, '../apps/api/shared/authMiddleware.js');
const { requireAdmin } = await import(pathToFileURL(authMiddlewarePath));

// Mock Request Class
class MockRequest {
    constructor(headers = {}) {
        this.headers = new Map(Object.entries(headers));
        this.method = 'GET';
        this.url = 'https://dev.somos.tech/api/dashboard-users/list';
    }
}

// Helper to create base64 header
function createAuthHeader(roles) {
    const principal = {
        identityProvider: 'aad',
        userId: 'test-user',
        userDetails: 'test@somos.tech',
        userRoles: roles
    };
    return Buffer.from(JSON.stringify(principal)).toString('base64');
}

async function runTests() {
    console.log('--- Testing Auth Middleware Logic Locally ---');

    // Test Case 1: Admin User
    console.log('\n[Test 1] User with "admin" role');
    const adminHeader = createAuthHeader(['anonymous', 'authenticated', 'admin']);
    const req1 = new MockRequest({
        'x-ms-client-principal': adminHeader
    });
    
    // Simulate the debug logging we added
    const header1 = req1.headers.get('x-ms-client-principal');
    if (header1) {
        const decoded = Buffer.from(header1, 'base64').toString('utf-8');
        console.log('DEBUG LOG: Decoded Header:', decoded);
    }

    const result1 = await requireAdmin(req1);
    console.log('requireAdmin result:', JSON.stringify(result1, null, 2));
    
    if (result1.isAdmin) {
        console.log('PASS: Admin access granted.');
    } else {
        console.error('FAIL: Admin access denied.');
    }

    // Test Case 2: Non-Admin User
    console.log('\n[Test 2] User WITHOUT "admin" role');
    const userHeader = createAuthHeader(['anonymous', 'authenticated']);
    const req2 = new MockRequest({
        'x-ms-client-principal': userHeader
    });

    const header2 = req2.headers.get('x-ms-client-principal');
    if (header2) {
        const decoded = Buffer.from(header2, 'base64').toString('utf-8');
        console.log('DEBUG LOG: Decoded Header:', decoded);
    }

    const result2 = await requireAdmin(req2);
    console.log('requireAdmin result:', JSON.stringify(result2, null, 2));

    if (result2.status === 403) {
        console.log('PASS: Access correctly forbidden.');
    } else {
        console.error('FAIL: Access should have been forbidden.');
    }
}

runTests().catch(console.error);
