$ErrorActionPreference = 'Stop'

$repoZipUrl = 'https://github.com/Lavish9999/RoamRoom/archive/refs/heads/main.zip?cachebust=fresh-start-v1'
$target = Join-Path $env:USERPROFILE 'RoamRoom-live'
$zip = Join-Path $env:TEMP 'roamroom-main.zip'
$extract = Join-Path $env:TEMP ('roamroom-extract-' + [guid]::NewGuid().ToString())

Write-Host ''
Write-Host 'RoamRoom fresh setup' -ForegroundColor Cyan
Write-Host 'This will create a clean folder at:' $target
Write-Host ''

Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $target -ErrorAction SilentlyContinue
Remove-Item -Force $zip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue

Write-Host 'Downloading latest GitHub code...' -ForegroundColor Cyan
Invoke-WebRequest -Uri $repoZipUrl -OutFile $zip

Write-Host 'Extracting clean copy...' -ForegroundColor Cyan
Expand-Archive -Path $zip -DestinationPath $extract -Force
$source = Join-Path $extract 'RoamRoom-main'
Move-Item -Path $source -Destination $target
Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue

Set-Location $target

if (!(Test-Path -LiteralPath '.npmrc')) {
  throw 'Latest setup check failed: .npmrc is missing. The download did not contain the current repo files.'
}

$mapPath = Join-Path $target 'app/(tabs)/map.tsx'
if (!(Test-Path -LiteralPath $mapPath)) {
  throw 'Latest setup check failed: app/(tabs)/map.tsx is missing.'
}

$hasNewMap = Select-String -LiteralPath $mapPath -Pattern 'Shinjuku' -Quiet
if (!$hasNewMap) {
  throw 'Latest setup check failed: Map tab is still the old placeholder file.'
}

Write-Host 'Verified latest Map tab and npm config.' -ForegroundColor Green
Write-Host 'Installing dependencies...' -ForegroundColor Cyan
npm install --legacy-peer-deps

Write-Host ''
Write-Host 'Starting Expo from the clean RoamRoom-live folder...' -ForegroundColor Green
npx expo start -c
