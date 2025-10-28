import { app } from '@azure/functions';
import agentService from '../shared/services/agentService.js';
import { successResponse, errorResponse, badRequestResponse } from '../shared/httpResponse.js';

app.http('InvokeAgent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'agent/invoke',
    handler: async (request, context) => {
        try {
            context.log('Invoking Azure OpenAI Foundry Agent');

            const body = await request.json();

            if (!body || !body.message) {
                return badRequestResponse('Message is required');
            }

            const { message, threadId, instructions } = body;

            const response = await agentService.invokeAgent({
                message,
                threadId,
                instructions
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
            context.log('Creating new agent thread');

            const body = await request.json();
            const { metadata } = body || {};

            const thread = await agentService.createThread(metadata);
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
            const threadId = request.params.threadId;
            context.log(`Getting messages for thread: ${threadId}`);

            const messages = await agentService.getThreadMessages(threadId);
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
            context.log(`Deleting agent thread: ${threadId}`);

            await agentService.deleteThread(threadId);
            return successResponse({ message: 'Thread deleted successfully' });
        } catch (error) {
            context.error('Error deleting thread:', error);
            return errorResponse(error);
        }
    }
});
