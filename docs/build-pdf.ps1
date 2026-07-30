# Genera docs/instructivo-jurados.pdf a partir del HTML usando Chrome headless.
# Sin headers/footers del navegador (fecha, ruta) gracias a --no-pdf-header-footer.
#
# Uso: desde la raiz del repo:
#   powershell -ExecutionPolicy Bypass -File docs\build-pdf.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root 'docs\instructivo-jurados.html'
$dst  = Join-Path $root 'docs\instructivo-jurados.pdf'
# Se genera primero en TEMP porque Chrome no maneja bien --print-to-pdf
# cuando el path contiene espacios (ej. carpetas de OneDrive).
$tmp  = Join-Path $env:TEMP 'instructivo-jurados.pdf'

if (-not (Test-Path $src)) {
  throw "No se encontro el HTML: $src"
}

$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) {
  $chrome = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
}
if (-not (Test-Path $chrome)) {
  throw 'No se encontro Chrome ni Edge para generar el PDF.'
}

$uri = ([System.Uri]((Resolve-Path $src).Path)).AbsoluteUri

Remove-Item $tmp -ErrorAction SilentlyContinue

$args = @(
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--no-sandbox',
  '--virtual-time-budget=20000',
  "--print-to-pdf=$tmp",
  $uri
)

Start-Process -FilePath $chrome -ArgumentList $args -NoNewWindow -Wait | Out-Null

if (-not (Test-Path $tmp)) {
  throw 'Chrome no genero el PDF.'
}

Copy-Item $tmp $dst -Force
Remove-Item $tmp -ErrorAction SilentlyContinue

$size = (Get-Item $dst).Length
Write-Output "PDF generado: $dst ($size bytes)"
