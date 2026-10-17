@echo off
setlocal
title Instalador do Cliente - Discord Clone Leve

echo ========================================================
echo    Instalador do Cliente - Discord Clone Leve
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando dependencias do Node.js...
if not exist "node_modules\" (
    echo Instalando pacotes npm...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar pacotes npm.
        pause
        exit /b 1
    )
) else (
    echo Pacotes npm ja estao instalados.
)

echo.
echo [2/3] Compilando executavel nativo (Tauri)...
call npm run tauri build
if errorlevel 1 (
    echo [ERRO] Falha ao compilar com Tauri.
    echo Certifique-se de que o Rust esta instalado (https://rustup.rs).
    pause
    exit /b 1
)

echo.
echo [3/3] Criando atalho na Area de Trabalho...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0criar-atalho.ps1"

echo.
echo ========================================================
echo   Instalacao concluida com sucesso!
echo   Voce ja pode abrir o app pelo atalho na Area de Trabalho.
echo ========================================================
echo.
pause
