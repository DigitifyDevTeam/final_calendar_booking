# PowerShell script to set up Gmail OAuth2 token on production server
# This script helps you set the GMAIL_TOKEN_JSON environment variable

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LoadEnvFile = Join-Path $ScriptDir "load_env.sh"
$TokenFile = Join-Path $ScriptDir "backend\gmail_token.json"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Gmail OAuth2 Token Setup for Production" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if token JSON is provided as argument
if ($args.Count -gt 0) {
    $TokenJSON = $args[0]
    Write-Host "Using token JSON from command line argument" -ForegroundColor Green
}
else {
    # Check if token file exists locally
    if (Test-Path $TokenFile) {
        Write-Host "✅ Found token file: $TokenFile" -ForegroundColor Green
        Write-Host ""
        Write-Host "Reading token from file..." -ForegroundColor Yellow
        
        try {
            $TokenData = Get-Content $TokenFile | ConvertFrom-Json
            $TokenJSON = $TokenData | ConvertTo-Json -Compress
        }
        catch {
            Write-Host "❌ Error reading token file: $_" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please provide the token JSON manually:" -ForegroundColor Yellow
            $TokenJSON = Read-Host "Enter Gmail OAuth2 Token JSON"
        }
    }
    else {
        Write-Host "❌ Token file not found: $TokenFile" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please provide the token JSON:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Option 1: Run this script with token JSON as argument:"
        Write-Host "  .\setup_production_gmail_token.ps1 '{\"token\":\"...\",\"refresh_token\":\"...\"}'" -ForegroundColor White
        Write-Host ""
        Write-Host "Option 2: Paste the token JSON when prompted below:" -ForegroundColor White
        Write-Host ""
        $TokenJSON = Read-Host "Enter Gmail OAuth2 Token JSON"
    }
}

if ([string]::IsNullOrWhiteSpace($TokenJSON)) {
    Write-Host "❌ Error: Token JSON is empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
$Preview = if ($TokenJSON.Length -gt 50) { $TokenJSON.Substring(0, 50) + "..." } else { $TokenJSON }
Write-Host "Token JSON received (first 50 chars): $Preview" -ForegroundColor Green
Write-Host ""

# Validate JSON format
try {
    $null = $TokenJSON | ConvertFrom-Json
    Write-Host "✅ Token JSON format is valid" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: Invalid JSON format" -ForegroundColor Red
    Write-Host "Please ensure the token JSON is valid JSON" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# For Windows, we'll create a .env file or show instructions
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Instructions" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For Linux/Production server:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Copy the token JSON to your production server" -ForegroundColor White
Write-Host "2. Run the setup script on the server:" -ForegroundColor White
Write-Host "   ./setup_production_gmail_token.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Or manually set the environment variable:" -ForegroundColor White
Write-Host "   export GMAIL_TOKEN_JSON='$TokenJSON'" -ForegroundColor Cyan
Write-Host ""
Write-Host "For Windows (development/testing):" -ForegroundColor Yellow
Write-Host ""
Write-Host "Set environment variable temporarily:" -ForegroundColor White
Write-Host "   `$env:GMAIL_TOKEN_JSON='$TokenJSON'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Set environment variable permanently (requires admin):" -ForegroundColor White
Write-Host "   [System.Environment]::SetEnvironmentVariable('GMAIL_TOKEN_JSON', '$TokenJSON', 'Machine')" -ForegroundColor Cyan
Write-Host ""

