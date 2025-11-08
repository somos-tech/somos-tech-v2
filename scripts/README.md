# Scripts

This directory contains utility scripts for managing the SOMOS.tech platform.

## Admin User Management

### add-admin-user.ps1

Adds a new admin user to the admin-users container in Cosmos DB.

**Usage:**
```powershell
.\add-admin-user.ps1 -Email "user@somos.tech" -Name "User Name" -Environment "dev"
```

**Parameters:**
- `-Email` (required): Email address of the user
- `-Name` (optional): Full name of the user
- `-Environment` (optional): Environment (dev/prod), defaults to "dev"

**Example:**
```powershell
.\add-admin-user.ps1 -Email "jcruz@somos.tech" -Name "Jose Cruz"
```

### add-first-admin.js

Node.js script to add the first admin user. Used for bootstrapping the admin system.

**Usage:**
```bash
cd scripts
npm install  # Install dependencies first time only
node add-first-admin.js
```

### check-admin-user.js

Check if a specific user exists in the admin-users container and list all admin users.

**Usage:**
```bash
cd scripts
node check-admin-user.js
```

## populate-groups.js

Populates the Cosmos DB with initial city chapter groups.

### Prerequisites

1. Ensure you have Azure credentials configured
2. Set the following environment variables:
   - `COSMOS_ENDPOINT`: Your Cosmos DB endpoint URL
   - `COSMOS_DATABASE_NAME`: Database name (default: 'somostech')

### Usage

**Using Node.js directly:**
```bash
cd scripts
node populate-groups.js
```

**Using PowerShell:**
```powershell
cd scripts
.\populate-groups.ps1
```

### What it does

1. Creates the `groups` container in Cosmos DB if it doesn't exist
2. Populates it with 23 initial groups including:
   - Major US cities (Seattle, New York, Boston, etc.)
   - Special groups (Virtual Events, Lab builder, Mentees, etc.)
3. Sets appropriate visibility (Public/Hidden) for each group

### Groups Created

- **Public Groups (19)**: Seattle, New York, Boston, Denver, Washington DC, Atlanta, San Francisco, Chicago, Austin, Houston, Los Angeles, Miami, Dallas, Phoenix, San Diego, Philadelphia, Sacramento, Dallas/Ft. Worth
- **Hidden Groups (4)**: Virtual Events, Lab builder, test-landing, Mentees, Starting in tech

Each group includes:
- Unique ID
- Name, City, State
- Visibility setting
- Image URL
- Description
- Timestamps
