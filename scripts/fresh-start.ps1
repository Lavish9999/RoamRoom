$ErrorActionPreference = 'Stop'

$repoZipUrl = 'https://github.com/Lavish9999/RoamRoom/archive/refs/heads/main.zip?cachebust=fresh-start-v3'
$target = Join-Path $env:USERPROFILE 'RoamRoom-live'
$zip = Join-Path $env:TEMP 'roamroom-main.zip'
$extract = Join-Path $env:TEMP ('roamroom-extract-' + [guid]::NewGuid().ToString())

Write-Host ''
Write-Host 'RoamRoom fresh setup' -ForegroundColor Cyan
Write-Host 'This will create a clean folder at:' $target
Write-Host ''

# If this script is launched from inside RoamRoom-live, Windows will not let us
# replace that folder. Step out first, then stop Metro and recreate the folder.
Set-Location $env:USERPROFILE
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

Remove-Item -Recurse -Force $target -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $target) {
  $backup = Join-Path $env:USERPROFILE ('RoamRoom-live-old-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  Rename-Item -Path $target -NewName (Split-Path $backup -Leaf) -ErrorAction Stop
}

Remove-Item -Force $zip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue

Write-Host 'Downloading latest GitHub code...' -ForegroundColor Cyan
Invoke-WebRequest -Uri $repoZipUrl -OutFile $zip

Write-Host 'Extracting clean copy...' -ForegroundColor Cyan
Expand-Archive -Path $zip -DestinationPath $extract -Force
$source = Join-Path $extract 'RoamRoom-main'
Move-Item -Path $source -Destination $target -Force
Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue

Set-Location $target

if (!(Test-Path -LiteralPath '.npmrc')) {
  throw 'Latest setup check failed: .npmrc is missing. The download did not contain the current repo files.'
}

$mapPath = Join-Path $target 'app/(tabs)/map.tsx'
if (!(Test-Path -LiteralPath $mapPath)) {
  throw 'Latest setup check failed: app/(tabs)/map.tsx is missing.'
}

# The current Map tab is a real react-native-maps MapView. These markers prove
# the freshly downloaded code is the native-map version, not a stale SVG build.
$hasNativeMap = Select-String -LiteralPath $mapPath -Pattern 'react-native-maps' -Quiet
$hasLiveBadge = Select-String -LiteralPath $mapPath -Pattern 'Live native map' -Quiet
if (!$hasNativeMap -or !$hasLiveBadge) {
  throw 'Latest setup check failed: Map tab is still an old version (no native react-native-maps MapView). The download did not contain the latest code.'
}

$pkgPath = Join-Path $target 'package.json'
if (!(Select-String -LiteralPath $pkgPath -Pattern 'react-native-maps' -Quiet)) {
  throw 'Latest setup check failed: react-native-maps is missing from package.json.'
}

Write-Host 'Verified latest native Map tab and npm config.' -ForegroundColor Green
Write-Host 'Installing dependencies...' -ForegroundColor Cyan
npm install --legacy-peer-deps

Write-Host ''
Write-Host 'Starting Expo from the clean RoamRoom-live folder...' -ForegroundColor Green
npx expo start -c
