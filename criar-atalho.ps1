# ========================================================
# Script PowerShell — Criar Atalho na Área de Trabalho
# Shelter
# ========================================================

$ErrorActionPreference = "Stop"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   📌 Criando Atalho do Shelter...        " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Procurar o executável nos caminhos possíveis
$PossiblePaths = @(
    "$CurrentDir\shelter.exe",
    "$CurrentDir\src-tauri\target\release\shelter.exe",
    "$CurrentDir\src-tauri\target\debug\shelter.exe"
)

$ExePath = $null
foreach ($path in $PossiblePaths) {
    if (Test-Path $path) {
        $ExePath = (Resolve-Path $path).Path
        break
    }
}

if (-not $ExePath) {
    Write-Host "`n[!] O executavel ainda nao foi compilado." -ForegroundColor Yellow
    Write-Host "Compilando agora (isso pode levar alguns minutos na primeira vez)...`n" -ForegroundColor Yellow
    
    Set-Location $CurrentDir
    npm run tauri build
    
    $ReleaseExe = "$CurrentDir\src-tauri\target\release\shelter.exe"
    if (Test-Path $ReleaseExe) {
        $ExePath = (Resolve-Path $ReleaseExe).Path
    } else {
        Write-Host "`n[ERRO] Nao foi possivel encontrar ou compilar o executavel." -ForegroundColor Red
        Exit 1
    }
}

$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Shelter.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ExePath
$Shortcut.WorkingDirectory = Split-Path -Parent $ExePath
$Shortcut.Description = "Shelter — Comunicacao em Tempo Real"

# Icone se existir
$IconPath = "$CurrentDir\src-tauri\icons\icon.ico"
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = "$IconPath,0"
}

$Shortcut.Save()

Write-Host "`n[SUCESSO] Atalho criado com sucesso na sua Area de Trabalho!" -ForegroundColor Green
Write-Host "Localizacao: $ShortcutPath" -ForegroundColor Gray
Write-Host "Executavel:  $ExePath`n" -ForegroundColor Gray
Write-Host "=====================================================`n" -ForegroundColor Cyan
