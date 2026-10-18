# بسته‌بندی پروژه برای پوشه Desktop\My future (بدون node_modules و secrets)
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $ProjectRoot 'web\package.json'))) {
  throw "Project root not found (expected web\package.json under $ProjectRoot)"
}
$MyFuture = Join-Path $env:USERPROFILE 'OneDrive\Desktop\My future'
if (-not (Test-Path $MyFuture)) {
  $MyFuture = Join-Path $env:USERPROFILE 'Desktop\My future'
}
if (-not (Test-Path $MyFuture)) {
  throw "پوشه My future پیدا نشد: $MyFuture"
}

$ZipName = 'reserve-football (2).zip'
$ZipPath = Join-Path $MyFuture $ZipName
$Stage = Join-Path $env:TEMP "reserve-football-pack-$(Get-Random)"
$StageProject = Join-Path $Stage 'reserve-football'

Write-Host "Source: $ProjectRoot"
Write-Host "Stage:  $StageProject"
Write-Host "Zip:    $ZipPath"

New-Item -ItemType Directory -Path $StageProject -Force | Out-Null

$ExcludeDirs = @(
  'node_modules', '.next', '.git', 'playwright-report', 'test-results', '.turbo', '.cursor'
)
$ExcludeFiles = @(
  '.env', '.env.local', 'Thumbs.db', '.DS_Store', 'cloudflared.log'
)

$Xd = ($ExcludeDirs | ForEach-Object { "/XD"; $_ }) -join ' '
$Xf = ($ExcludeFiles | ForEach-Object { "/XF"; $_ }) -join ' '

$robocopyArgs = @(
  $ProjectRoot, $StageProject,
  '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS', '/NP'
) + ($ExcludeDirs | ForEach-Object { '/XD'; $_ }) + ($ExcludeFiles | ForEach-Object { '/XF'; $_ })

& robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with code $LASTEXITCODE" }

$docsToCopy = @(
  'sakhtar-safahat-sanschii.pdf',
  'sakhtar-safahat-sanschii.html'
)
foreach ($f in $docsToCopy) {
  $src = Join-Path $ProjectRoot "docs\$f"
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination (Join-Path $MyFuture $f) -Force
    Write-Host "Copied doc: $f"
  }
}

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Push-Location $Stage
try {
  tar -a -c -f $ZipPath 'reserve-football'
} finally {
  Pop-Location
}

Remove-Item $Stage -Recurse -Force -ErrorAction SilentlyContinue

$sizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host "Done: $ZipPath ($sizeMb MB)"
