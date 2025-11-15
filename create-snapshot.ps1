# Repo Snapshot Builder
$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Creating repo snapshot for review..." -ForegroundColor Cyan

# Clean up
if (Test-Path 'repo_snapshot_for_review.zip') { Remove-Item -Force 'repo_snapshot_for_review.zip' }
if (Test-Path 'temp_snapshot') { Remove-Item -Recurse -Force 'temp_snapshot' }

# Create temp directory
New-Item -ItemType Directory -Path 'temp_snapshot' | Out-Null

# Copy Backend API
Write-Host "Copying Backend API..." -ForegroundColor Yellow
robocopy 'apps/api' 'temp_snapshot/apps/api' /E /XD node_modules .next dist .turbo /XF *.log /NFL /NDL /NJH /NJS /nc /ns /np

# Copy Frontend Web
Write-Host "Copying Frontend Web..." -ForegroundColor Yellow
robocopy 'apps/web' 'temp_snapshot/apps/web' /E /XD node_modules .next dist .turbo /XF *.log /NFL /NDL /NJH /NJS /nc /ns /np

# Copy Database Package
Write-Host "Copying Database..." -ForegroundColor Yellow
robocopy 'packages/database' 'temp_snapshot/packages/database' /E /XD node_modules dist /XF *.log /NFL /NDL /NJH /NJS /nc /ns /np

# Copy Documentation
Write-Host "Copying Documentation..." -ForegroundColor Yellow
if (Test-Path 'docs') { robocopy 'docs' 'temp_snapshot/docs' /E /NFL /NDL /NJH /NJS /nc /ns /np }

# Copy Infrastructure
Write-Host "Copying Infrastructure..." -ForegroundColor Yellow
if (Test-Path 'infrastructure') { robocopy 'infrastructure' 'temp_snapshot/infrastructure' /E /XD node_modules /NFL /NDL /NJH /NJS /nc /ns /np }
if (Test-Path 'infra') { robocopy 'infra' 'temp_snapshot/infra' /E /XD node_modules /NFL /NDL /NJH /NJS /nc /ns /np }

# Copy CI/CD
Write-Host "Copying CI/CD..." -ForegroundColor Yellow
if (Test-Path '.github') { robocopy '.github' 'temp_snapshot/.github' /E /NFL /NDL /NJH /NJS /nc /ns /np }

# Copy Root Files
Write-Host "Copying Root Files..." -ForegroundColor Yellow
$rootFiles = @(
    'README.md',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'turbo.json',
    'docker-compose.yml',
    'Dockerfile',
    '.env.example',
    'CLAUDE.md',
    '.eslintrc.json',
    '.prettierrc',
    '.gitignore'
)

foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Copy-Item $file 'temp_snapshot/' -Force
    }
}

# Create ZIP
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path 'temp_snapshot\*' -DestinationPath 'repo_snapshot_for_review.zip' -Force

# Clean up temp
Remove-Item -Recurse -Force 'temp_snapshot'

# Report
if (Test-Path 'repo_snapshot_for_review.zip') {
    $size = [math]::Round((Get-Item 'repo_snapshot_for_review.zip').Length / 1MB, 2)
    Write-Host ""
    Write-Host "SUCCESS: repo_snapshot_for_review.zip created" -ForegroundColor Green
    Write-Host "Size: $size MB" -ForegroundColor Green
    Write-Host ""
    Write-Host "Contents:" -ForegroundColor Cyan
    Write-Host "  - apps/api (Backend API)" -ForegroundColor White
    Write-Host "  - apps/web (Frontend Web)" -ForegroundColor White
    Write-Host "  - packages/database (Database migrations)" -ForegroundColor White
    Write-Host "  - docs (Documentation)" -ForegroundColor White
    Write-Host "  - Root configuration files" -ForegroundColor White
} else {
    Write-Host "FAILED: Could not create archive" -ForegroundColor Red
}
