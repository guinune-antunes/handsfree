@echo off
title Encerrar Shelter
echo ========================================================
echo  Encerrando Shelter e todos os seus sub-processos...
echo ========================================================
taskkill /F /IM shelter.exe /T >nul 2>&1
echo [OK] Todos os processos do Shelter foram finalizados.
timeout /t 2 >nul
