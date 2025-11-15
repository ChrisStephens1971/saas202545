# Script to add ProtectedPage wrapper to multiple pages
# Usage: .\add-page-protection.ps1

$pages = @(
    @{Path="apps/web/src/app/events/new/page.tsx"; Roles="['admin', 'editor', 'submitter']"},
    @{Path="apps/web/src/app/announcements/new/page.tsx"; Roles="['admin', 'editor', 'submitter']"},
    @{Path="apps/web/src/app/donations/new/page.tsx"; Roles="['admin', 'editor']"},
    @{Path="apps/web/src/app/forms/new/page.tsx"; Roles="['admin', 'editor']"},
    @{Path="apps/web/src/app/groups/new/page.tsx"; Roles="['admin', 'editor', 'submitter']"},
    @{Path="apps/web/src/app/attendance/new/page.tsx"; Roles="['kiosk']"}
)

foreach ($page in $pages) {
    $filePath = $page.Path
    $roles = $page.Roles

    Write-Host "Processing $filePath..."

    if (-not (Test-Path $filePath)) {
        Write-Host "  File not found, skipping" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content $filePath -Raw

    # Check if already protected
    if ($content -match "ProtectedPage") {
        Write-Host "  Already protected, skipping" -ForegroundColor Green
        continue
    }

    # Add import if not present
    if ($content -notmatch "import.*ProtectedPage") {
        $content = $content -replace "(import.*from '@/components/ui/Card';)", "`$1`nimport { ProtectedPage } from '@/components/auth/ProtectedPage';"
    }

    # Find the return statement and wrap content
    $content = $content -replace "(\s+return \()\s*\n\s*(<div className=`"container)", "`$1`n    <ProtectedPage requiredRoles={$roles}>`n      `$2"

    # Find closing </div> and add closing tag
    $lastDivIndex = $content.LastIndexOf("</div>`n  );`n}")
    if ($lastDivIndex -gt 0) {
        $content = $content.Insert($lastDivIndex + 6, "`n    </ProtectedPage>")
    }

    # Save the file
    Set-Content -Path $filePath -Value $content -NoNewline
    Write-Host "  Protected with roles: $roles" -ForegroundColor Green
}

Write-Host "`nDone!" -ForegroundColor Cyan
