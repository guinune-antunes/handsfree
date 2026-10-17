@echo off
title Diagnostico Completo - Discord Clone Leve
echo ==========================================================
echo    Executando Diagnostico Completo do Sistema...
echo ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnostico.ps1"
echo.
pause
