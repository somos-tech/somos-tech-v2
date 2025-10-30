# Scripts for Group Management

## Upload Images to Azure Storage

Upload local images to Azure Blob Storage for use in groups:

```powershell
.\upload-images.ps1
```

**What it does:**
1. Creates an `images` folder if it doesn't exist
2. Uploads all images (jpg, png, webp, gif) from the folder to Azure Storage
3. Saves uploaded URLs to `uploaded-image-urls.json`

**Image naming convention:**
- Use format: `group-<id>.jpg` (e.g., `group-seattle.jpg`)
- Matches group IDs in `groups-data.json`

**Example:**
```powershell
# Add images to the images folder first
mkdir images
# Copy your images there...

# Then upload
.\upload-images.ps1
```

---

## Deploy Groups (Simple)

Deploy groups to Cosmos DB using existing URLs:

```powershell
.\deploy-groups.ps1
```

**What it does:**
1. Creates `groups` container in Cosmos DB
2. Inserts all 23 groups from `groups-data.json`
3. Uses image URLs as defined in the JSON file

---

## Deploy Groups with Image Upload (Recommended)

Upload images AND deploy groups in one command:

```powershell
.\deploy-groups-with-images.ps1
```

**What it does:**
1. Uploads images from `./images` folder to Azure Storage
2. Updates group image URLs to use uploaded Azure Storage URLs
3. Creates `groups` container in Cosmos DB
4. Inserts all groups with updated URLs

**Complete workflow:**
```powershell
# 1. Create images folder and add your images
mkdir images
# Copy group images here (e.g., group-seattle.jpg, group-newyork.jpg)

# 2. Run the deployment script
.\deploy-groups-with-images.ps1

# Done! Images are uploaded and groups are created
```

---

## Parameters

All scripts support custom parameters:

```powershell
# Custom storage account
.\upload-images.ps1 -StorageAccount "mystorageaccount" -ImagesFolder ".\my-images"

# Custom Cosmos DB settings
.\deploy-groups.ps1 `
    -CosmosAccount "my-cosmos-account" `
    -ResourceGroup "my-rg" `
    -Database "mydb" `
    -Container "groups"

# Full custom deployment
.\deploy-groups-with-images.ps1 `
    -StorageAccount "mystorageaccount" `
    -CosmosAccount "my-cosmos-account" `
    -ImagesFolder ".\custom-images"
```

---

## Quick Reference

| Script | Purpose | Images Required |
|--------|---------|----------------|
| `upload-images.ps1` | Upload images only | Yes |
| `deploy-groups.ps1` | Deploy groups only | No |
| `deploy-groups-with-images.ps1` | Upload images + deploy groups | Optional |
| `populate-via-api.ps1` | Deploy via API endpoint | No |

---

## Troubleshooting

**"Not logged in to Azure"**
```powershell
az login
```

**"Images folder not found"**
```powershell
mkdir images
# Add your images to the folder
```

**"Container already exists"**
- This is normal, the script will skip creation and proceed with data insertion

**"Group already exists"**
- Groups are skipped if they already exist in Cosmos DB
- To update existing groups, delete them first or use the API PUT endpoint
