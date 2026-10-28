# Empaqueta la extensión para subirla a la Chrome Web Store / Edge Add-ons.
# El ZIP resultante tiene manifest.json en la raíz (requisito de la Store).
# Uso:  .\pack.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# Recompila sidepanel/*.js y background.js desde *.ts para asegurar que el ZIP incluye
# siempre el JS más reciente.
Push-Location $root
try {
    if (-not (Test-Path (Join-Path $root "node_modules"))) { npm install }
    npm run build
} finally {
    Pop-Location
}

$manifest = Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json
$version  = $manifest.version
$output   = Join-Path $root "barcode-scanner-ext-$version.zip"

# Solo se incluye lo que necesita la extensión; se excluye el tooling (*.ts, tsconfig, etc.).
$include = @("manifest.json", "background.js", "sidepanel", "icons")

$staging = Join-Path $root "obj\pack-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

try {
    foreach ($item in $include) {
        $p = Join-Path $root $item
        if (-not (Test-Path $p)) { throw "Falta el fichero/carpeta: $item" }
        Copy-Item -Path $p -Destination (Join-Path $staging $item) -Recurse
    }

    Get-ChildItem -Path $staging -Recurse -Filter "*.ts" | Remove-Item -Force

    if (Test-Path $output) { Remove-Item $output -Force }
    Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $output -Force
} finally {
    Remove-Item $staging -Recurse -Force
}

Write-Host "Empaquetado: $output ($([math]::Round((Get-Item $output).Length / 1KB, 1)) KB)"
