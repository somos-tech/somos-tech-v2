import { TableClient } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';

class SponsorService {
    constructor() {
        const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        this.tableName = 'Sponsors';

        // Use Managed Identity if storage account name is provided, otherwise fallback to connection string
        if (storageAccountName) {
            const credential = new DefaultAzureCredential();
            const tableEndpoint = `https://${storageAccountName}.table.core.windows.net`;
            this.tableClient = new TableClient(tableEndpoint, this.tableName, credential);
            console.log(`SponsorService: Using Managed Identity with storage account: ${storageAccountName}`);
        } else if (connectionString) {
            this.tableClient = TableClient.fromConnectionString(connectionString, this.tableName);
            console.log('SponsorService: Using connection string authentication');
        } else {
            console.warn('SponsorService: No authentication configured. Set AZURE_STORAGE_ACCOUNT_NAME (for Managed Identity) or AZURE_STORAGE_CONNECTION_STRING');
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

    _toTableEntity(sponsor) {
        return {
            partitionKey: 'SPONSOR',
            rowKey: sponsor.id,
            name: sponsor.name || '',
            tier: sponsor.tier || '',
            logo: sponsor.logo || '',
            website: sponsor.website || '',
            contactEmail: sponsor.contactEmail || '',
            contactName: sponsor.contactName || '',
            contributionAmount: sponsor.contributionAmount || 0,
            createdAt: sponsor.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    _fromTableEntity(entity) {
        return {
            id: entity.rowKey,
            name: entity.name,
            tier: entity.tier,
            logo: entity.logo,
            website: entity.website,
            contactEmail: entity.contactEmail,
            contactName: entity.contactName,
            contributionAmount: entity.contributionAmount,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
        };
    }

    async getSponsors() {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this._ensureTableExists();

        const entities = this.tableClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'SPONSOR'" }
        });

        const sponsors = [];
        for await (const entity of entities) {
            sponsors.push(this._fromTableEntity(entity));
        }

        return sponsors;
    }

    async getSponsorById(id) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        try {
            const entity = await this.tableClient.getEntity('SPONSOR', id);
            return this._fromTableEntity(entity);
        } catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            throw error;
        }
    }

    async createSponsor(sponsorDto) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this._ensureTableExists();

        const newSponsor = {
            id: String(Date.now()),
            ...sponsorDto,
            createdAt: new Date().toISOString()
        };

        const entity = this._toTableEntity(newSponsor);
        await this.tableClient.createEntity(entity);

        return newSponsor;
    }

    async updateSponsor(id, sponsorDto) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        const existing = await this.getSponsorById(id);
        if (!existing) {
            throw new Error('Sponsor not found');
        }

        const updatedSponsor = {
            ...existing,
            ...sponsorDto,
            id,
            updatedAt: new Date().toISOString()
        };

        const entity = this._toTableEntity(updatedSponsor);
        await this.tableClient.updateEntity(entity, 'Replace');

        return updatedSponsor;
    }

    async deleteSponsor(id) {
        if (!this.tableClient) {
            throw new Error('Table Storage not configured');
        }

        await this.tableClient.deleteEntity('SPONSOR', id);
    }
}

export default new SponsorService();
