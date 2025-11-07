import { app } from '@azure/functions';
import agentService from '../shared/services/agentService.js';
import { successResponse, errorResponse, badRequestResponse } from '../shared/httpResponse.js';
import { rateLimitMiddleware, getClientIdentifier } from '../shared/rateLimiter.js';

/**
 * Extract user access token from Azure Static Web Apps authentication headers
 * This token can be used for On-Behalf-Of authentication flow
 */
function extractUserAccessToken(request) {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // For Static Web Apps, you might also get it from x-ms-token-aad-access-token
    const swaToken = request.headers.get('x-ms-token-aad-access-token');
    if (swaToken) {
        return swaToken;
    }

    return null;
}

app.http('InvokeAgent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'agent/invoke',
    handler: async (request, context) => {
        try {
            // Apply rate limiting: 10 agent invocations per 5 minutes per IP
            // AI agent calls can be resource-intensive, so we limit them more strictly
            const rateLimitError = rateLimitMiddleware(request, 10, 300000);
            if (rateLimitError) {
                context.log.warn(`Rate limit exceeded for agent invocation from IP: ${getClientIdentifier(request)}`);
                return rateLimitError;
            }

            context.log('Invoking Azure OpenAI Foundry Agent');

            const body = await request.json();

            if (!body || !body.message) {
                return badRequestResponse('Message is required');
            }

            const { message, threadId, instructions } = body;
            const userAccessToken = extractUserAccessToken(request);

            if (userAccessToken) {
                context.log('Using On-Behalf-Of authentication with user token');
            } else {
                context.log('Using DefaultAzureCredential (no user token found)');
            }

            const response = await agentService.invokeAgent({
                message,
                threadId,
                instructions,
                userAccessToken
            });

            return successResponse(response);
        } catch (error) {
            context.error('Error invoking agent:', error);
            return errorResponse(error);
        }
    }
});

app.http('CreateAgentThread', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'agent/thread',
    handler: async (request, context) => {
        try {
            // Apply rate limiting: 10 thread creations per 5 minutes per IP
            // Thread creation should be less frequent than message sending
            const rateLimitError = rateLimitMiddleware(request, 10, 300000);
            if (rateLimitError) {
                context.log.warn(`Rate limit exceeded for thread creation from IP: ${getClientIdentifier(request)}`);
                return rateLimitError;
            }

            context.log('Creating new agent thread');

            const body = await request.json();
            const { metadata } = body || {};
            const userAccessToken = extractUserAccessToken(request);

            const thread = await agentService.createThread(metadata, userAccessToken);
            return successResponse(thread, 201);
        } catch (error) {
            context.error('Error creating agent thread:', error);
            return errorResponse(error);
        }
    }
});

app.http('GetAgentThreadMessages', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'agent/thread/{threadId}/messages',
    handler: async (request, context) => {
        try {
            // Apply rate limiting: 30 message retrievals per minute per IP
            // Read operations can be more frequent than writes
            const rateLimitError = rateLimitMiddleware(request, 30, 60000);
            if (rateLimitError) {
                context.log.warn(`Rate limit exceeded for message retrieval from IP: ${getClientIdentifier(request)}`);
                return rateLimitError;
            }

            const threadId = request.params.threadId;
            const userAccessToken = extractUserAccessToken(request);
            context.log(`Getting messages for thread: ${threadId}`);

            const messages = await agentService.getThreadMessages(threadId, 20, userAccessToken);
            return successResponse(messages);
        } catch (error) {
            context.error('Error getting thread messages:', error);
            return errorResponse(error);
        }
    }
});

app.http('DeleteAgentThread', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'agent/thread/{threadId}',
    handler: async (request, context) => {
        try {
            const threadId = request.params.threadId;
            const userAccessToken = extractUserAccessToken(request);
            context.log(`Deleting agent thread: ${threadId}`);

            await agentService.deleteThread(threadId, userAccessToken);
            return successResponse({ message: 'Thread deleted successfully' });
        } catch (error) {
            context.error('Error deleting thread:', error);
            return errorResponse(error);
        }
    }
});
