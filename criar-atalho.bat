@echo off
title Criar Atalho - Shelter
echo Criando atalho na Area de Trabalho...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0criar-atalho.ps1"
pause
