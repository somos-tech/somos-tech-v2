const https = require('https');

const functionUrl = 'https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net/api/GetUserRoles';
const payload = JSON.stringify({
    userId: 'test-user-id',
    userDetails: 'jcruz@somos.tech',
    identityProvider: 'aad'
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

console.log(`Testing GetUserRoles at ${functionUrl}...`);
console.log('Payload:', payload);

const req = https.request(functionUrl, options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response Body:', data);
        try {
            const json = JSON.parse(data);
            if (json.roles && json.roles.includes('admin')) {
                console.log('SUCCESS: Admin role returned!');
            } else {
                console.log('FAILURE: Admin role NOT returned.');
            }
        } catch (e) {
            console.log('Error parsing response:', e.message);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(payload);
req.end();
