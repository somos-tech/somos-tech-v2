import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

class EventService {
    constructor() {
        const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
        const databaseName = process.env.COSMOS_DATABASE_NAME || 'somostech';
        const containerName = 'events';

        if (!cosmosEndpoint) {
            console.warn('EventService: COSMOS_ENDPOINT not configured');
            this.container = null;
            return;
        }

        try {
            // Use Managed Identity for authentication
            const credential = new DefaultAzureCredential();
            this.client = new CosmosClient({
                endpoint: cosmosEndpoint,
                aadCredentials: credential
            });

            this.database = this.client.database(databaseName);
            this.container = this.database.container(containerName);

            console.log(`EventService: Connected to Cosmos DB - Database: ${databaseName}, Container: ${containerName}`);
        } catch (error) {
            console.error('EventService: Failed to initialize Cosmos DB client', error);
            this.container = null;
        }
    }

    _toCosmosDocument(event) {
        // Cosmos DB document structure
        const document = {
            id: event.id,
            chapter: event.chapter || 'Seattle', // Default to Seattle chapter
            name: event.name || '',
            date: event.date || '',
            location: event.location || '', // Venue location (can be neighboring city)
            status: event.status || 'draft',
            attendees: event.attendees || 0,
            capacity: event.capacity || 0,
            description: event.description || '',
            createdAt: event.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Store socialMediaPosts as object (Cosmos DB supports nested objects)
        if (event.socialMediaPosts) {
            document.socialMediaPosts = event.socialMediaPosts;
        }

        // Store social media agent status fields
        if (event.socialMediaPostsStatus) {
            document.socialMediaPostsStatus = event.socialMediaPostsStatus;
        }
        if (event.socialMediaAgentThreadId) {
            document.socialMediaAgentThreadId = event.socialMediaAgentThreadId;
        }
        if (event.socialMediaAgentRunId) {
            document.socialMediaAgentRunId = event.socialMediaAgentRunId;
        }
        if (event.socialMediaAgentError) {
            document.socialMediaAgentError = event.socialMediaAgentError;
        }

        // Store venue agent related fields
        if (event.venueRecommendations) {
            document.venueRecommendations = event.venueRecommendations;
        }
        if (event.venueAgentStatus) {
            document.venueAgentStatus = event.venueAgentStatus;
        }
        if (event.venueAgentThreadId) {
            document.venueAgentThreadId = event.venueAgentThreadId;
        }
        if (event.venueAgentRunId) {
            document.venueAgentRunId = event.venueAgentRunId;
        }
        if (event.venueAgentError) {
            document.venueAgentError = event.venueAgentError;
        }

        return document;
    }

    _fromCosmosDocument(document) {
        // Remove Cosmos DB system properties
        const { _rid, _self, _etag, _attachments, _ts, ...event } = document;
        return event;
    }

    async getEvents() {
        if (!this.container) {
            throw new Error('Cosmos DB not configured');
        }

        try {
            const querySpec = {
                query: 'SELECT * FROM c'
            };

            const { resources } = await this.container.items.query(querySpec).fetchAll();
            return resources.map(doc => this._fromCosmosDocument(doc));
        } catch (error) {
            console.error('Error fetching events from Cosmos DB:', error);
            throw error;
        }
    }

    async getEventById(id) {
        if (!this.container) {
            throw new Error('Cosmos DB not configured');
        }

        try {
            // Query by id since we don't know the chapter (partition key)
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: id }]
            };

            const { resources } = await this.container.items.query(querySpec).fetchAll();
            return resources.length > 0 ? this._fromCosmosDocument(resources[0]) : null;
        } catch (error) {
            console.error('Error fetching event by ID from Cosmos DB:', error);
            throw error;
        }
    }

    async createEvent(eventDto) {
        if (!this.container) {
            throw new Error('Cosmos DB not configured');
        }

        try {
            const newEvent = {
                id: String(Date.now()),
                ...eventDto,
                chapter: eventDto.chapter || 'Seattle', // Default to Seattle chapter
                status: eventDto.status || 'draft',
                createdAt: new Date().toISOString()
            };

            const document = this._toCosmosDocument(newEvent);
            const { resource } = await this.container.items.create(document);

            return this._fromCosmosDocument(resource);
        } catch (error) {
            console.error('Error creating event in Cosmos DB:', error);
            throw error;
        }
    }

    async updateEvent(id, eventDto) {
        if (!this.container) {
            throw new Error('Cosmos DB not configured');
        }

        try {
            // Get existing document first
            const existing = await this.getEventById(id);
            if (!existing) {
                throw new Error('Event not found');
            }

            const updatedEvent = {
                ...existing,
                ...eventDto,
                id,
                chapter: eventDto.chapter || existing.chapter, // Preserve or update chapter
                updatedAt: new Date().toISOString()
            };

            const document = this._toCosmosDocument(updatedEvent);
            // Use chapter as partition key
            const { resource } = await this.container.item(id, document.chapter).replace(document);

            return this._fromCosmosDocument(resource);
        } catch (error) {
            console.error('Error updating event in Cosmos DB:', error);
            throw error;
        }
    }

    async deleteEvent(id) {
        if (!this.container) {
            throw new Error('Cosmos DB not configured');
        }

        try {
            // Get existing document first to know the partition key (chapter)
            const existing = await this.getEventById(id);
            if (!existing) {
                return; // Already deleted or doesn't exist
            }

            await this.container.item(id, existing.chapter).delete();
        } catch (error) {
            if (error.code !== 404) {
                console.error('Error deleting event from Cosmos DB:', error);
                throw error;
            }
        }
    }
}

// Export singleton instance
export default new EventService();
