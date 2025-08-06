# Script para iniciar el servidor
Set-Location "C:\Users\ichav\OneDrive\Documents\Aplicaci-n-con-acceso-a-base-de-datos-no-relacional\renta-autos"
Write-Host "Directorio actual: $(Get-Location)"
Write-Host "Iniciando servidor..."
node app.js
