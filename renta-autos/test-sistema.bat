@echo off
echo ================================================
echo       SISTEMA DE PRUEBAS AUTOMATIZADAS
echo ================================================
echo.

:menu
echo Selecciona una opcion:
echo.
echo 1. Verificar sistema completo
echo 2. Probar backup completo
echo 3. Probar backup diferencial
echo 4. Probar logging de registros
echo 5. Probar sistema de permisos
echo 6. Ver archivos generados
echo 7. Iniciar servidor
echo 8. Salir
echo.
set /p choice="Ingresa tu opcion (1-8): "

if "%choice%"=="1" goto verificar
if "%choice%"=="2" goto backup_completo
if "%choice%"=="3" goto backup_diferencial
if "%choice%"=="4" goto logging
if "%choice%"=="5" goto permisos
if "%choice%"=="6" goto ver_archivos
if "%choice%"=="7" goto servidor
if "%choice%"=="8" goto salir
goto menu

:verificar
echo.
echo Ejecutando verificacion completa del sistema...
echo.
node verificar-sistema.js
pause
goto menu

:backup_completo
echo.
echo Ejecutando prueba de backup completo...
echo.
node test-backup-full.js
pause
goto menu

:backup_diferencial
echo.
echo Ejecutando prueba de backup diferencial...
echo.
node test-backup-diferencial.js
pause
goto menu

:logging
echo.
echo Ejecutando prueba de logging...
echo.
node test-logging.js
pause
goto menu

:permisos
echo.
echo Ejecutando prueba de permisos...
echo.
node test-permisos.js
pause
goto menu

:ver_archivos
echo.
echo === ARCHIVOS DE BACKUP ===
if exist "backups\*" (
    dir backups /o-d
) else (
    echo No hay backups disponibles
)
echo.
echo === ARCHIVOS DE LOG ===
if exist "logs\*" (
    dir logs /o-d
) else (
    echo No hay logs disponibles
)
echo.
pause
goto menu

:servidor
echo.
echo Iniciando servidor de la aplicacion...
echo Presiona Ctrl+C para detener el servidor
echo.
npm start
pause
goto menu

:salir
echo.
echo Gracias por usar el sistema de pruebas!
echo.
pause
exit
