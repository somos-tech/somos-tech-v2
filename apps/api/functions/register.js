import { app } from '@azure/functions';
import { getContainer } from '../shared/db.js';
import { rateLimitMiddleware, getClientIdentifier } from '../shared/rateLimiter.js';

const containerId = 'members';

app.http('register', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'register',
    handler: async (request, context) => {
        context.log('Processing member registration request');

        try {
            // Apply rate limiting: 3 registration attempts per hour per IP
            const rateLimitError = rateLimitMiddleware(request, 3, 3600000);
            if (rateLimitError) {
                context.log.warn(`Rate limit exceeded for IP: ${getClientIdentifier(request)}`);
                return rateLimitError;
            }

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

            // Validate email format (enhanced)
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!emailRegex.test(email)) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Invalid email format'
                    }
                };
            }

            // Validate name fields (prevent injection attacks)
            // First check they are strings
            if (typeof firstName !== 'string' || typeof lastName !== 'string') {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'First name and last name must be valid strings'
                    }
                };
            }

            if (firstName.length > 50 || lastName.length > 50) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'First name and last name must be less than 50 characters'
                    }
                };
            }

            // Prevent special characters in names that could be used for injection
            const nameRegex = /^[a-zA-Z\s'-]+$/;
            if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Names can only contain letters, spaces, hyphens, and apostrophes'
                    }
                };
            }

            // Get container
            const container = getContainer(containerId);

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
