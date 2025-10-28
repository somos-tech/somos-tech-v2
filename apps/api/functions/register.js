const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

// Initialize Cosmos DB client (you'll need to add these to your app settings)
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

const databaseId = 'somostech';
const containerId = 'members';

app.http('register', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'register',
    handler: async (request, context) => {
        context.log('Processing member registration request');

        try {
            const body = await request.json();
            const { email, firstName, lastName } = body;

            // Validate required fields
            if (!email || !firstName || !lastName) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Missing required fields: email, firstName, lastName'
                    }
                };
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Invalid email format'
                    }
                };
            }

            // Get database and container
            const database = client.database(databaseId);
            const container = database.container(containerId);

            // Check if user already exists
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.email = @email',
                parameters: [
                    {
                        name: '@email',
                        value: email.toLowerCase()
                    }
                ]
            };

            const { resources: existingUsers } = await container.items
                .query(querySpec)
                .fetchAll();

            if (existingUsers.length > 0) {
                return {
                    status: 409,
                    jsonBody: {
                        error: 'A member with this email already exists'
                    }
                };
            }

            // Create new member
            const newMember = {
                id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                email: email.toLowerCase(),
                firstName,
                lastName,
                registeredAt: new Date().toISOString(),
                status: 'pending_verification',
                role: 'member',
                emailVerified: false
            };

            const { resource: createdMember } = await container.items.create(newMember);

            // TODO: Send verification email here
            // You would integrate with Azure Communication Services or SendGrid
            context.log(`Member registered: ${createdMember.email}`);

            return {
                status: 201,
                jsonBody: {
                    message: 'Registration successful! Please check your email to verify your account.',
                    memberId: createdMember.id
                }
            };

        } catch (error) {
            context.log.error('Registration error:', error);
            return {
                status: 500,
                jsonBody: {
                    error: 'An error occurred during registration. Please try again later.'
                }
            };
        }
    }
});
