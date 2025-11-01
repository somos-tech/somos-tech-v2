import agentService from './agentService.js';

class VenueAgentService {
    constructor() {
        // Use a separate agent ID for venue outreach if configured
        this.venueAgentId = process.env.VENUE_AGENT_ID || process.env.AZURE_OPENAI_AGENT_ID;

        // Define the JSON schema for venue recommendations response
        this.venueResponseSchema = {
            type: "json_schema",
            json_schema: {
                name: "venue_recommendations",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        venues: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string",
                                        description: "Official venue name"
                                    },
                                    address: {
                                        type: "string",
                                        description: "Complete address including street, city, state, and zip code"
                                    },
                                    capacity: {
                                        type: "number",
                                        description: "Maximum capacity for events"
                                    },
                                    amenities: {
                                        type: "array",
                                        items: {
                                            type: "string"
                                        },
                                        description: "Available amenities like WiFi, Projector, Bar, Seating, etc."
                                    },
                                    contact: {
                                        type: "object",
                                        properties: {
                                            email: {
                                                type: "string",
                                                description: "Contact email address (REQUIRED)"
                                            },
                                            phone: {
                                                type: "string",
                                                description: "Contact phone number"
                                            },
                                            website: {
                                                type: "string",
                                                description: "Venue website URL"
                                            }
                                        },
                                        required: ["phone", "website", "email"],
                                        additionalProperties: false
                                    },
                                    notes: {
                                        type: "string",
                                        description: "Comprehensive information about pricing, booking requirements, what's included, and why it's recommended"
                                    },
                                    emailTemplate: {
                                        type: "string",
                                        description: "Personalized email draft for reaching out to this specific venue"
                                    }
                                },
                                required: ["name", "address", "capacity", "amenities", "contact", "notes", "emailTemplate"],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ["venues"],
                    additionalProperties: false
                }
            }
        };
    }

    /**
     * Check the status of an agent run and process the results if completed
     */
    async checkAgentRunStatus(event, eventService) {
        if (!event.venueAgentThreadId || !event.venueAgentRunId) {
            return {
                success: false,
                error: 'No agent run found for this event'
            };
        }

        try {
            // Override the agent ID if a specific venue agent is configured
            const originalAgentId = agentService.agentId;
            agentService.agentId = this.venueAgentId;

            try {
                // Check the run status
                const run = await agentService.getRun(event.venueAgentThreadId, event.venueAgentRunId);

                if (run.status === 'completed') {
                    // Get the messages from the thread
                    const messages = await agentService.getThreadMessages(event.venueAgentThreadId, 10);
                    const assistantMessage = messages.find(msg => msg.role === 'assistant');
                    const rawResponse = assistantMessage?.content?.[0]?.text?.value || 'No response';

                    // Try to parse and validate the response
                    let parsedData = null;
                    let validationError = null;

                    try {
                        parsedData = agentService.extractJsonFromResponse(rawResponse);
                        // Normalize: if agent returned { venueRecommendations: [...] }, convert to { venues: [...] }
                        if (parsedData.venueRecommendations && !parsedData.venues) {
                            parsedData = { venues: parsedData.venueRecommendations };
                        }
                    } catch (error) {
                        validationError = error.message;
                    }

                    if (parsedData) {
                        // Update the event with the completed data
                        await eventService.updateEvent(event.id, {
                            venueRecommendations: parsedData,
                            venueAgentStatus: 'completed',
                            venueAgentError: null
                        });

                        return {
                            success: true,
                            status: 'completed',
                            venues: parsedData
                        };
                    } else {
                        // Validation failed
                        await eventService.updateEvent(event.id, {
                            venueAgentStatus: 'failed',
                            venueAgentError: `Validation failed: ${validationError}`
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
                        venueAgentStatus: 'failed',
                        venueAgentError: errorMessage
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
     * Format event data into the required JSON structure for the venue agent
     */
    formatEventForAgent(event) {
        // Extract city from location if possible
        const location = event.location || '';
        const city = this.extractCityFromLocation(location);

        // Build the event requirements for venue search
        const eventRequirements = {
            eventName: event.name,
            eventDate: event.date,
            expectedAttendees: event.attendees || event.capacity || 50,
            eventType: 'tech meetup', // Can be made configurable
            city: city,
            requiredAmenities: [
                'WiFi',
                'Seating'
            ],
            preferredCapacityRange: {
                min: event.attendees || 30,
                max: event.capacity || 100
            }
        };

        return {
            eventRequirements,
            searchPreferences: {
                includeCoworkingSpaces: true,
                includeBars: true,
                includeRestaurants: true
            },
            organizerInfo: {
                organizerName: event.organizerName || process.env.ORGANIZER_NAME || 'Event Organizer',
                organizationName: event.organizationName || process.env.ORGANIZATION_NAME || 'SOMOS.tech'
            }
        };
    }

    /**
     * Extract city name from location string
     */
    extractCityFromLocation(location) {
        // Simple extraction - you may want to enhance this
        // Assumes formats like "City, State" or "Venue Name, City"
        const parts = location.split(',');
        if (parts.length >= 2) {
            return parts[parts.length - 2].trim();
        }
        return location.trim();
    }

    /**
     * Generate venue recommendations for a newly created event
     */
    async generateVenueRecommendations(event) {
        try {
            // Format the event data
            const formattedInput = this.formatEventForAgent(event);

            // Create the message for the agent
            const message = `Find and recommend suitable venues for the following event:\n\n${JSON.stringify(formattedInput, null, 2)}`;

            // Override the agent ID if a specific venue agent is configured
            const originalAgentId = agentService.agentId;
            agentService.agentId = this.venueAgentId;

            try {
                // Invoke the agent with the venue response schema
                const response = await agentService.invokeAgent({
                    message,
                    instructions: 'Search for suitable venues based on the event requirements. For each venue, find their email address and draft a personalized outreach email. Return a JSON response with venue recommendations including name, address, capacity, amenities, contact information (with email), and a personalized email template for reaching out.',
                    responseFormat: this.venueResponseSchema
                });

                // Restore original agent ID
                agentService.agentId = originalAgentId;

                // Check if we have validated data
                if (response.parsedData) {
                    // Normalize: if agent returned { venueRecommendations: [...] }, convert to { venues: [...] }
                    let normalizedData = response.parsedData;
                    if (normalizedData.venueRecommendations && !normalizedData.venues) {
                        normalizedData = { venues: normalizedData.venueRecommendations };
                    }

                    return {
                        success: true,
                        threadId: response.threadId,
                        runId: response.runId,
                        venues: normalizedData,
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
            console.error('Error generating venue recommendations:', error);
            return {
                success: false,
                error: error.message,
                eventId: event.id
            };
        }
    }

    /**
     * Generate venue recommendations asynchronously (fire and forget)
     * This is useful when you don't want to block the event creation
     */
    async generateVenuesAsync(event, eventService) {
        // Immediately mark the event as 'in-progress' before starting the agent
        try {
            await eventService.updateEvent(event.id, {
                venueAgentStatus: 'in-progress'
            });
            console.log(`Venue search marked as in-progress for event ${event.id}`);
        } catch (error) {
            console.error(`Failed to mark event ${event.id} venue status as in-progress:`, error);
        }

        // Run in background without awaiting
        this.generateVenueRecommendations(event)
            .then(async result => {
                console.log(`Venue recommendations generated for event ${event.id}:`, result.success);

                // Save the venues back to the event if successful
                if (result.success && eventService) {
                    try {
                        await eventService.updateEvent(event.id, {
                            venueRecommendations: result.venues,
                            venueAgentStatus: 'completed',
                            venueAgentThreadId: result.threadId,
                            venueAgentRunId: result.runId,
                            venueAgentError: null
                        });
                        console.log(`Venue recommendations saved to event ${event.id}`);
                    } catch (saveError) {
                        console.error(`Failed to save venues to event ${event.id}:`, saveError);
                        await eventService.updateEvent(event.id, {
                            venueAgentStatus: 'failed',
                            venueAgentError: `Failed to save: ${saveError.message}`
                        });
                    }
                } else {
                    // Mark as failed if generation unsuccessful
                    try {
                        await eventService.updateEvent(event.id, {
                            venueAgentStatus: 'failed',
                            venueAgentError: result.error || 'Unknown error'
                        });
                    } catch (updateError) {
                        console.error(`Failed to update error status for event ${event.id}:`, updateError);
                    }
                }
            })
            .catch(async error => {
                console.error(`Failed to generate venue recommendations for event ${event.id}:`, error);
                try {
                    await eventService.updateEvent(event.id, {
                        venueAgentStatus: 'failed',
                        venueAgentError: error.message || 'Unknown error'
                    });
                } catch (updateError) {
                    console.error(`Failed to update error status for event ${event.id}:`, updateError);
                }
            });
    }
}

export default new VenueAgentService();
