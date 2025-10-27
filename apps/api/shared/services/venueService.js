import { TableClient } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';

class VenueService {
    constructor() {
        const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        this.tableName = 'Venues';

        // Use Managed Identity if storage account name is provided, otherwise fallback to connection string
        if (storageAccountName) {
            const credential = new DefaultAzureCredential();
            const tableEndpoint = `https://${storageAccountName}.table.core.windows.net`;
            this.tableClient = new TableClient(tableEndpoint, this.tableName, credential);
            console.log(`VenueService: Using Managed Identity with storage account: ${storageAccountName}`);
        } else if (connectionString) {
            this.tableClient = TableClient.fromConnectionString(connectionString, this.tableName);
            console.log('VenueService: Using connection string authentication');
        } else {
            console.warn('VenueService: No authentication configured. Set AZURE_STORAGE_ACCOUNT_NAME (for Managed Identity) or AZURE_STORAGE_CONNECTION_STRING');
            this.tableClient = null;
        }
    }

    async _ensureTableExists() {
        if (this.tableClient) {
            try {
                await this.tableClient.createTable();
            } catch (error) {
                if (error.statusCode !== 409) {
                    throw error;
                }
            }
        }
    }

    _toTableEntity(venue) {
        return {
            partitionKey: 'VENUE',
            rowKey: venue.id,
            name: venue.name || '',
            address: venue.address || '',
            city: venue.city || '',
            state: venue.state || '',
            zipCode: venue.zipCode || '',
            capacity: venue.capacity || 0,
            amenities: JSON.stringify(venue.amenities || []),
            contactEmail: venue.contactEmail || '',
            contactPhone: venue.contactPhone || '',
            createdAt: venue.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    _fromTableEntity(entity) {
        return {
            id: entity.rowKey,
            name: entity.name,
            address: entity.address,
            city: entity.city,
            state: entity.state,
            zipCode: entity.zipCode,
            capacity: entity.capacity,
            amenities: JSON.parse(entity.amenities || '[]'),
            contactEmail: entity.contactEmail,
            contactPhone: entity.contactPhone,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
        };
    }

    async getVenues() {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this._ensureTableExists();

        const entities = this.tableClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'VENUE'" }
        });

        const venues = [];
        for await (const entity of entities) {
            venues.push(this._fromTableEntity(entity));
        }

        return venues;
    }

    async getVenueById(id) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        try {
            const entity = await this.tableClient.getEntity('VENUE', id);
            return this._fromTableEntity(entity);
        } catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            throw error;
        }
    }

    async createVenue(venueDto) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this._ensureTableExists();

        const newVenue = {
            id: String(Date.now()),
            ...venueDto,
            createdAt: new Date().toISOString()
        };

        const entity = this._toTableEntity(newVenue);
        await this.tableClient.createEntity(entity);

        return newVenue;
    }

    async updateVenue(id, venueDto) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        const existing = await this.getVenueById(id);
        if (!existing) {
            throw new Error('Venue not found');
        }

        const updatedVenue = {
            ...existing,
            ...venueDto,
            id,
            updatedAt: new Date().toISOString()
        };

        const entity = this._toTableEntity(updatedVenue);
        await this.tableClient.updateEntity(entity, 'Replace');

        return updatedVenue;
    }

    async deleteVenue(id) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this.tableClient.deleteEntity('VENUE', id);
    }
}

export default new VenueService();
