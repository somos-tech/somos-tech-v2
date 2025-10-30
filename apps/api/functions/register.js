import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

// Initialize Cosmos DB client
// Uses DefaultAzureCredential which works both locally (Azure CLI) and in Azure (Managed Identity)
const endpoint = process.env.COSMOS_ENDPOINT;

if (!endpoint) {
    throw new Error('COSMOS_ENDPOINT must be configured');
}

const credential = new DefaultAzureCredential();
const client = new CosmosClient({ endpoint, aadCredentials: credential });

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
