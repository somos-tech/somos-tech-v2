import { DefaultAzureCredential, OnBehalfOfCredential } from '@azure/identity';

class AgentService {
    constructor() {
        this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        this.apiKey = process.env.AZURE_OPENAI_API_KEY;
        this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview';
        this.agentId = process.env.AZURE_OPENAI_AGENT_ID;
        this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

        // OBO configuration
        this.clientId = process.env.AZURE_CLIENT_ID;
        this.tenantId = process.env.AZURE_TENANT_ID;
        this.clientSecret = process.env.AZURE_CLIENT_SECRET;

        if (!this.endpoint) {
            throw new Error('AZURE_OPENAI_ENDPOINT environment variable is required');
        }

        if (!this.agentId) {
            throw new Error('AZURE_OPENAI_AGENT_ID environment variable is required');
        }
    }

    async getAuthHeader(userAccessToken = null) {
        // If user access token is provided, use OBO flow
        if (userAccessToken && this.clientId && this.tenantId && this.clientSecret) {
            const credential = new OnBehalfOfCredential({
                tenantId: this.tenantId,
                clientId: this.clientId,
                clientSecret: this.clientSecret,
                userAssertionToken: userAccessToken
            });

            const token = await credential.getToken('https://cognitiveservices.azure.com/.default');
            return {
                'Authorization': `Bearer ${token.token}`
            };
        }

        // Fallback to DefaultAzureCredential (for local dev or when OBO not configured)
        const credential = new DefaultAzureCredential();
        const token = await credential.getToken('https://cognitiveservices.azure.com/.default');
        return {
            'Authorization': `Bearer ${token.token}`
        };
    }

    async createThread(metadata = {}, userAccessToken = null) {
        try {
            const authHeader = await this.getAuthHeader(userAccessToken);

            const response = await fetch(
                `${this.endpoint}/threads?api-version=${this.apiVersion}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeader
                    },
                    body: JSON.stringify({
                        metadata
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create thread: ${response.status} - ${errorText}`);
            }

            const thread = await response.json();
            return thread;
        } catch (error) {
            throw new Error(`Error creating thread: ${error.message}`);
        }
    }

    async addMessageToThread(threadId, message, userAccessToken = null) {
        try {
            const authHeader = await this.getAuthHeader(userAccessToken);

            const response = await fetch(
                `${this.endpoint}/threads/${threadId}/messages?api-version=${this.apiVersion}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeader
                    },
                    body: JSON.stringify({
                        role: 'user',
                        content: message
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to add message: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error adding message to thread: ${error.message}`);
        }
    }

    async runAgent(threadId, instructions = null, responseFormat = null, userAccessToken = null) {
        try {
            const authHeader = await this.getAuthHeader(userAccessToken);

            const body = {
                assistant_id: this.agentId
            };

            if (instructions) {
                body.instructions = instructions;
            }

            if (responseFormat) {
                body.response_format = responseFormat;
            }

            const response = await fetch(
                `${this.endpoint}/threads/${threadId}/runs?api-version=${this.apiVersion}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeader
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to run agent: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error running agent: ${error.message}`);
        }
    }

    async getRun(threadId, runId, userAccessToken = null) {
        try {
            const authHeader = await this.getAuthHeader(userAccessToken);

            const response = await fetch(
                `${this.endpoint}/threads/${threadId}/runs/${runId}?api-version=${this.apiVersion}`,
                {
                    method: 'GET',
                    headers: {
                        ...authHeader
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get run status: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error getting run status: ${error.message}`);
        }
    }

    async waitForRunCompletion(threadId, runId, maxWaitTime = 300000, pollInterval = 1000, userAccessToken = null) {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            const run = await this.getRun(threadId, runId, userAccessToken);

            if (run.status === 'completed') {
                return run;
            } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
                throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
            }

            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error('Agent run timed out');
    }

    async getThreadMessages(threadId, limit = 20, userAccessToken = null) {
        try {
            const authHeader = await this.getAuthHeader(userAccessToken);

            const response = await fetch(
                `${this.endpoint}/threads/${threadId}/messages?api-version=${this.apiVersion}&limit=${limit}`,
                {
                    method: 'GET',
                    headers: {
                        ...authHeader
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get messages: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            throw new Error(`Error getting thread messages: ${error.message}`);
        }
    }

    async deleteThread(threadId, userAccessToken = null) {
        try {
            const authHeader = await this.getAuthHeader(userAccessToken);

            const response = await fetch(
                `${this.endpoint}/threads/${threadId}?api-version=${this.apiVersion}`,
                {
                    method: 'DELETE',
                    headers: {
                        ...authHeader
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete thread: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error deleting thread: ${error.message}`);
        }
    }

    /**
     * Attempts to extract and parse JSON from agent response text
     * @param {string} text - The raw text response from the agent
     * @returns {object} - Parsed JSON object
     */
    extractJsonFromResponse(text) {
        // Try to find JSON in markdown code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
            return JSON.parse(codeBlockMatch[1]);
        }

        // Try to find raw JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error('No valid JSON found in agent response');
    }

    async invokeAgent({ message, threadId = null, instructions = null, responseFormat = null, userAccessToken = null }) {
        try {
            // Create a new thread if not provided
            let thread;
            if (!threadId) {
                thread = await this.createThread({}, userAccessToken);
                threadId = thread.id;
            }

            // Add the user message to the thread
            await this.addMessageToThread(threadId, message, userAccessToken);

            // Run the agent
            const run = await this.runAgent(threadId, instructions, responseFormat, userAccessToken);

            // Wait for completion
            await this.waitForRunCompletion(threadId, run.id, 300000, 1000, userAccessToken);

            // Get the latest messages
            const messages = await this.getThreadMessages(threadId, 10, userAccessToken);

            // Get the assistant's response (first message with role 'assistant')
            const assistantMessage = messages.find(msg => msg.role === 'assistant');
            const rawResponse = assistantMessage?.content?.[0]?.text?.value || 'No response';

            // Try to extract and validate JSON if the response looks like it contains structured data
            let parsedData = null;
            let validationError = null;

            try {
                parsedData = this.extractJsonFromResponse(rawResponse);
            } catch (error) {
                validationError = error.message;
                console.warn('Failed to parse/validate agent response as SocialMediaPosts:', error.message);
            }

            const response = {
                threadId: threadId,
                runId: run.id,
                message: rawResponse,
                parsedData: parsedData,
                validationError: validationError,
                allMessages: messages
            };

            return response;
        } catch (error) {
            throw new Error(`Error invoking agent: ${error.message}`);
        }
    }
}

export default new AgentService();
