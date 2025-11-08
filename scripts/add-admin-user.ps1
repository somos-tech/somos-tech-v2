# Script to add an admin user to the admin-users container
# Usage: .\add-admin-user.ps1 -Email "user@somos.tech" -Name "User Name"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [string]$Name = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# Set the resource group based on environment
$resourceGroup = "rg-somos-tech-$Environment"

Write-Host "Adding admin user to Cosmos DB..." -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Get Cosmos DB account name
$cosmosAccount = az cosmosdb list --resource-group $resourceGroup --query "[0].name" -o tsv

if (-not $cosmosAccount) {
    Write-Host "Error: Could not find Cosmos DB account in resource group $resourceGroup" -ForegroundColor Red
    exit 1
}

Write-Host "Cosmos DB Account: $cosmosAccount" -ForegroundColor Green

# Change to scripts directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if node modules are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing required npm packages..." -ForegroundColor Yellow
    npm install @azure/cosmos @azure/identity
}

# Update the add-first-admin.js script to use parameters
$jsScript = @"
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function addAdmin() {
    const cosmosAccount = process.argv[2];
    const adminEmail = process.argv[3];
    const adminName = process.argv[4] || adminEmail.split('@')[0];
    
    const endpoint = ``https://`${cosmosAccount}.documents.azure.com:443/``;
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({ endpoint, aadCredentials: credential });
    
    const container = client.database('somostech').container('admin-users');
    
    // Check if user already exists
    const { resources: existingUsers } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: adminEmail }]
    }).fetchAll();
    
    if (existingUsers.length > 0) {
        console.log('✅ User already exists:', existingUsers[0]);
        console.log('Current roles:', existingUsers[0].roles);
        
        // Update to ensure admin role
        const user = existingUsers[0];
        if (!user.roles.includes('admin')) {
            user.roles.push('admin');
            user.updatedAt = new Date().toISOString();
            user.updatedBy = 'admin-script';
            
            const { resource: updated } = await container.item(user.id, user.email).replace(user);
            console.log('✅ Updated user with admin role:', updated);
        }
        return;
    }
    
    // Create new admin user
    const newAdminUser = {
        id: ``admin-`${Date.now()}-`${Math.random().toString(36).substr(2, 9)}``,
        email: adminEmail,
        name: adminName,
        roles: ['admin', 'authenticated'],
        status: 'active',
        identityProvider: 'aad',
        createdAt: new Date().toISOString(),
        createdBy: 'admin-script',
        lastLogin: null
    };
    
    const { resource: created } = await container.items.create(newAdminUser);
    console.log('✅ Successfully created admin user:');
    console.log(JSON.stringify(created, null, 2));
}

addAdmin().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
"@

$jsScript | Out-File -FilePath "add-admin-temp.js" -Encoding utf8

# Run the script
node add-admin-temp.js $cosmosAccount $Email $Name

# Clean up
Remove-Item "add-admin-temp.js" -ErrorAction SilentlyContinue

Write-Host "`n✅ Done!" -ForegroundColor Green
Write-Host "The user can now access the admin portal at /admin/users" -ForegroundColor Cyan
