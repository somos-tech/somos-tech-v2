import { TableClient } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';

class EventService {
    constructor() {
        const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        this.tableName = 'Events';

        // Use Managed Identity if storage account name is provided, otherwise fallback to connection string
        if (storageAccountName) {
            const credential = new DefaultAzureCredential();
            const tableEndpoint = `https://${storageAccountName}.table.core.windows.net`;
            this.tableClient = new TableClient(tableEndpoint, this.tableName, credential);
            console.log(`EventService: Using Managed Identity with storage account: ${storageAccountName}`);
        } else if (connectionString) {
            this.tableClient = TableClient.fromConnectionString(connectionString, this.tableName);
            console.log('EventService: Using connection string authentication');
        } else {
            console.warn('EventService: No authentication configured. Set AZURE_STORAGE_ACCOUNT_NAME (for Managed Identity) or AZURE_STORAGE_CONNECTION_STRING');
            this.tableClient = null;
        }
    }

    async _ensureTableExists() {
        if (this.tableClient) {
            try {
                await this.tableClient.createTable();
            } catch (error) {
                // Table might already exist, ignore error
                if (error.statusCode !== 409) {
                    throw error;
                }
            }
        }
    }

    _toTableEntity(event) {
        // Azure Table Storage requires partitionKey and rowKey
        const entity = {
            partitionKey: 'EVENT', // All events in same partition for simplicity
            rowKey: event.id,
            name: event.name || '',
            date: event.date || '',
            location: event.location || '',
            status: event.status || 'draft',
            attendees: event.attendees || 0,
            capacity: event.capacity || 0,
            description: event.description || '',
            createdAt: event.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Store socialMediaPosts as JSON string if present
        if (event.socialMediaPosts) {
            entity.socialMediaPosts = JSON.stringify(event.socialMediaPosts);
        }

        // Store social media agent status fields
        if (event.socialMediaPostsStatus) {
            entity.socialMediaPostsStatus = event.socialMediaPostsStatus;
        }
        if (event.socialMediaAgentThreadId) {
            entity.socialMediaAgentThreadId = event.socialMediaAgentThreadId;
        }
        if (event.socialMediaAgentRunId) {
            entity.socialMediaAgentRunId = event.socialMediaAgentRunId;
        }
        if (event.socialMediaAgentError) {
            entity.socialMediaAgentError = event.socialMediaAgentError;
        }

        return entity;
    }

    _fromTableEntity(entity) {
        const event = {
            id: entity.rowKey,
            name: entity.name,
            date: entity.date,
            location: entity.location,
            status: entity.status,
            attendees: entity.attendees,
            capacity: entity.capacity,
            description: entity.description,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
        };

        // Parse socialMediaPosts from JSON string if present
        if (entity.socialMediaPosts) {
            try {
                event.socialMediaPosts = JSON.parse(entity.socialMediaPosts);
            } catch (error) {
                console.warn('Failed to parse socialMediaPosts:', error);
            }
        }

        // Add social media agent status fields
        if (entity.socialMediaPostsStatus) {
            event.socialMediaPostsStatus = entity.socialMediaPostsStatus;
        }
        if (entity.socialMediaAgentThreadId) {
            event.socialMediaAgentThreadId = entity.socialMediaAgentThreadId;
        }
        if (entity.socialMediaAgentRunId) {
            event.socialMediaAgentRunId = entity.socialMediaAgentRunId;
        }
        if (entity.socialMediaAgentError) {
            event.socialMediaAgentError = entity.socialMediaAgentError;
        }

        return event;
    }

    async getEvents() {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this._ensureTableExists();

        const entities = this.tableClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'EVENT'" }
        });

        const events = [];
        for await (const entity of entities) {
            events.push(this._fromTableEntity(entity));
        }

        return events;
    }

    async getEventById(id) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        try {
            const entity = await this.tableClient.getEntity('EVENT', id);
            return this._fromTableEntity(entity);
        } catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            throw error;
        }
    }

    async createEvent(eventDto) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this._ensureTableExists();

        const newEvent = {
            id: String(Date.now()),
            ...eventDto,
            status: eventDto.status || 'draft',
            createdAt: new Date().toISOString()
        };

        const entity = this._toTableEntity(newEvent);
        await this.tableClient.createEntity(entity);

        return newEvent;
    }

    async updateEvent(id, eventDto) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        // Get existing entity first
        const existing = await this.getEventById(id);
        if (!existing) {
            throw new Error('Event not found');
        }

        const updatedEvent = {
            ...existing,
            ...eventDto,
            id,
            updatedAt: new Date().toISOString()
        };

        const entity = this._toTableEntity(updatedEvent);
        await this.tableClient.updateEntity(entity, 'Replace');

        return updatedEvent;
    }

    async deleteEvent(id) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this.tableClient.deleteEntity('EVENT', id);
    }
}

// Export singleton instance
export default new EventService();
