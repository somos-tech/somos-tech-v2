import agentService from './agentService.js';

class SocialMediaService {
    constructor() {
        // Use a separate agent ID for social media posts if configured
        this.socialMediaAgentId = process.env.SOCIAL_MEDIA_AGENT_ID || process.env.AZURE_OPENAI_AGENT_ID;
    }

    /**
     * Check the status of an agent run and process the results if completed
     */
    async checkAgentRunStatus(event, eventService) {
        if (!event.socialMediaAgentThreadId || !event.socialMediaAgentRunId) {
            return {
                success: false,
                error: 'No agent run found for this event'
            };
        }

        try {
            // Override the agent ID if a specific social media agent is configured
            const originalAgentId = agentService.agentId;
            agentService.agentId = this.socialMediaAgentId;

            try {
                // Check the run status
                const run = await agentService.getRun(event.socialMediaAgentThreadId, event.socialMediaAgentRunId);

                if (run.status === 'completed') {
                    // Get the messages from the thread
                    const messages = await agentService.getThreadMessages(event.socialMediaAgentThreadId, 10);
                    const assistantMessage = messages.find(msg => msg.role === 'assistant');
                    const rawResponse = assistantMessage?.content?.[0]?.text?.value || 'No response';

                    // Try to parse and validate the response
                    let parsedData = null;
                    let validationError = null;

                    try {
                        parsedData = agentService.extractJsonFromResponse(rawResponse);
                    } catch (error) {
                        validationError = error.message;
                    }

                    if (parsedData) {
                        // Update the event with the completed data
                        await eventService.updateEvent(event.id, {
                            socialMediaPosts: parsedData,
                            socialMediaPostsStatus: 'completed',
                            socialMediaAgentError: null
                        });

                        return {
                            success: true,
                            status: 'completed',
                            posts: parsedData
                        };
                    } else {
                        // Validation failed
                        await eventService.updateEvent(event.id, {
                            socialMediaPostsStatus: 'failed',
                            socialMediaAgentError: `Validation failed: ${validationError}`
                        });

                        return {
                            success: false,
                            status: 'failed',
                            error: validationError
                        };
                    }
                } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
                    // Agent run failed
                    const errorMessage = run.last_error?.message || `Run ${run.status}`;
                    await eventService.updateEvent(event.id, {
                        socialMediaPostsStatus: 'failed',
                        socialMediaAgentError: errorMessage
                    });

                    return {
                        success: false,
                        status: run.status,
                        error: errorMessage
                    };
                } else {
                    // Still in progress
                    return {
                        success: true,
                        status: run.status,
                        inProgress: true
                    };
                }
            } finally {
                // Restore original agent ID
                agentService.agentId = originalAgentId;
            }
        } catch (error) {
            console.error('Error checking agent run status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Format event data into the required JSON structure for the social media agent
     */
    formatEventForAgent(event) {
        // Build the event object according to agent requirements
        const formattedEvent = {
            name: event.name,
            description: event.description || '',
            startDateTimeISO: event.date, // Assuming this is in ISO format
            venue: event.location || '',
            city: '', // Extract from location if needed
            channel: 'in-person', // Default, can be derived from event data
            url: event.url || '',
            rsvpUrl: event.rsvpUrl || event.url || ''
        };

        // Default audience
        const audience = {
            primary: 'tech community members, developers, students'
        };

        // Default constraints
        const constraints = {
            tone: 'friendly',
            hashtags: ['#SomosTech', '#TechCommunity'],
            emojiAllowed: true,
            linksInCopy: true
        };

        // Compliance requirements
        const compliance = {
            noMedicalClaims: true,
            accessibleAltText: true
        };

        const localization = {
            en_us: true
        };

        return {
            event: formattedEvent,
            audience,
            constraints,
            compliance,
            localization
        };
    }

    /**
     * Generate social media posts for a newly created event
     */
    async generateSocialMediaPosts(event) {
        try {
            // Format the event data
            const formattedInput = this.formatEventForAgent(event);

            // Create the message for the agent
            const message = `Generate social media posts for the following event:\n\n${JSON.stringify(formattedInput, null, 2)}`;

            // Override the agent ID if a specific social media agent is configured
            const originalAgentId = agentService.agentId;
            agentService.agentId = this.socialMediaAgentId;

            try {
                // Invoke the agent with strict instructions
                const response = await agentService.invokeAgent({
                    message,
                    instructions: 'Follow your system instructions exactly. Return ONLY valid JSON matching the SocialMediaPosts schema. No markdown code blocks, no extra fields, just the raw JSON object.'
                });

                // Restore original agent ID
                agentService.agentId = originalAgentId;

                // Check if we have validated data
                if (response.parsedData) {
                    return {
                        success: true,
                        threadId: response.threadId,
                        runId: response.runId,
                        posts: response.parsedData,
                        eventId: event.id
                    };
                }

                // If validation failed, return error with details
                if (response.validationError) {
                    console.error('Agent response validation failed:', response.validationError);
                    return {
                        success: false,
                        error: `Schema validation failed: ${response.validationError}`,
                        rawResponse: response.message,
                        eventId: event.id
                    };
                }

                // Fallback for unexpected response format
                return {
                    success: false,
                    error: 'Agent did not return valid JSON data',
                    rawResponse: response.message,
                    eventId: event.id
                };
            } catch (agentError) {
                // Restore original agent ID even on error
                agentService.agentId = originalAgentId;
                throw agentError;
            }
        } catch (error) {
            console.error('Error generating social media posts:', error);
            return {
                success: false,
                error: error.message,
                eventId: event.id
            };
        }
    }

    /**
     * Generate posts asynchronously (fire and forget)
     * This is useful when you don't want to block the event creation
     */
    async generatePostsAsync(event, eventService) {
        // Immediately mark the event as 'in-progress' before starting the agent
        try {
            await eventService.updateEvent(event.id, {
                socialMediaPostsStatus: 'in-progress'
            });
            console.log(`Social media generation marked as in-progress for event ${event.id}`);
        } catch (error) {
            console.error(`Failed to mark event ${event.id} as in-progress:`, error);
        }

        // Run in background without awaiting
        this.generateSocialMediaPosts(event)
            .then(async result => {
                console.log(`Social media posts generated for event ${event.id}:`, result.success);

                // Save the posts back to the event if successful
                if (result.success && eventService) {
                    try {
                        await eventService.updateEvent(event.id, {
                            socialMediaPosts: result.posts,
                            socialMediaPostsStatus: 'completed',
                            socialMediaAgentThreadId: result.threadId,
                            socialMediaAgentRunId: result.runId,
                            socialMediaAgentError: null
                        });
                        console.log(`Social media posts saved to event ${event.id}`);
                    } catch (saveError) {
                        console.error(`Failed to save posts to event ${event.id}:`, saveError);
                        await eventService.updateEvent(event.id, {
                            socialMediaPostsStatus: 'failed',
                            socialMediaAgentError: `Failed to save: ${saveError.message}`
                        });
                    }
                } else {
                    // Mark as failed if generation unsuccessful
                    try {
                        await eventService.updateEvent(event.id, {
                            socialMediaPostsStatus: 'failed',
                            socialMediaAgentError: result.error || 'Unknown error'
                        });
                    } catch (updateError) {
                        console.error(`Failed to update error status for event ${event.id}:`, updateError);
                    }
                }
            })
            .catch(async error => {
                console.error(`Failed to generate posts for event ${event.id}:`, error);
                try {
                    await eventService.updateEvent(event.id, {
                        socialMediaPostsStatus: 'failed',
                        socialMediaAgentError: error.message || 'Unknown error'
                    });
                } catch (updateError) {
                    console.error(`Failed to update error status for event ${event.id}:`, updateError);
                }
            });
    }
}

export default new SocialMediaService();
