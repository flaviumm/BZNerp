$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
  Write-Error "Falta SUPABASE_SERVICE_ROLE_KEY en el entorno."
}

if (-not $env:VITE_SUPABASE_URL -and -not $env:SUPABASE_URL) {
  Write-Error "Falta VITE_SUPABASE_URL o SUPABASE_URL en el entorno."
}

npm.cmd run backup
