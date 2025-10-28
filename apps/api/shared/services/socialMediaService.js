import agentService from './agentService.js';

class SocialMediaService {
    constructor() {
        // Use a separate agent ID for social media posts if configured
        this.socialMediaAgentId = process.env.SOCIAL_MEDIA_AGENT_ID || process.env.AZURE_OPENAI_AGENT_ID;
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

        // Localization (Colombia-specific)
        const localization = {
            es_CO: true
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
                // Invoke the agent
                const response = await agentService.invokeAgent({
                    message,
                    instructions: 'Follow your instructions to generate social media posts. Return ONLY the JSON response as specified in your instructions.'
                });

                // Restore original agent ID
                agentService.agentId = originalAgentId;

                // Try to parse the JSON response
                let postsData;
                try {
                    const messageText = response.message;
                    // Try to extract JSON from the response (in case it's wrapped in markdown code blocks)
                    const jsonMatch = messageText.match(/```json\s*([\s\S]*?)\s*```/) ||
                        messageText.match(/```\s*([\s\S]*?)\s*```/);

                    const jsonText = jsonMatch ? jsonMatch[1] : messageText;
                    postsData = JSON.parse(jsonText);
                } catch (parseError) {
                    console.warn('Could not parse agent response as JSON:', parseError);
                    postsData = { rawResponse: response.message };
                }

                return {
                    success: true,
                    threadId: response.threadId,
                    runId: response.runId,
                    posts: postsData,
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
        // Run in background without awaiting
        this.generateSocialMediaPosts(event)
            .then(async result => {
                console.log(`Social media posts generated for event ${event.id}:`, result.success);

                // Save the posts back to the event if successful
                if (result.success && eventService) {
                    try {
                        await eventService.updateEvent(event.id, {
                            socialMediaPosts: result.posts
                        });
                        console.log(`Social media posts saved to event ${event.id}`);
                    } catch (saveError) {
                        console.error(`Failed to save posts to event ${event.id}:`, saveError);
                    }
                }
            })
            .catch(error => {
                console.error(`Failed to generate posts for event ${event.id}:`, error);
            });
    }
}

export default new SocialMediaService();
