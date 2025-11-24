# PowerShell wrapper for the Node.js debug script
# This script installs dependencies if needed and runs the debug-admin-roles.js script

$ErrorActionPreference = "Stop"

Write-Host "Checking for dependencies..."

# Define paths to tools
$NpmPath = "C:\Program Files\nodejs\npm.cmd"
$NodePath = "C:\Program Files\nodejs\node.exe"

# Check if node_modules exists in scripts folder
if (-not (Test-Path "scripts/node_modules")) {
    Write-Host "Installing dependencies in scripts folder..."
    Push-Location "scripts"
    # Initialize package.json if not exists
    if (-not (Test-Path "package.json")) {
        & $NpmPath init -y
        # Set type to module to support ES imports
        & $NpmPath pkg set type="module"
    }
    & $NpmPath install @azure/cosmos @azure/identity
    Pop-Location
}

Write-Host "Running debug-admin-roles.js..."
& $NodePath "scripts/debug-admin-roles.js" $args
