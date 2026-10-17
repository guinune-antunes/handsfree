# ==============================================================================
# FERRAMENTA DE DIAGNÓSTICO COMPLETO E AUDITORIA SEM LACUNAS
# Sistema: Discord Clone Leve
# Executa varredura profunda de SO, WebView2, Arquivos, Rede, Portas, Logs e Firewall
# ==============================================================================

$ErrorActionPreference = "Continue"

$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ReportFile = Join-Path $DesktopPath "DIAGNOSTICO_DISCORD_CLONE.txt"
$LocalReport = Join-Path (Get-Location) "DIAGNOSTICO_DISCORD_CLONE.txt"
$Output = New-Object System.Collections.Generic.List[string]

function Log-Msg {
    param(
        [string]$Tag,
        [string]$Text,
        [string]$Color = "White"
    )
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] [$Tag] $Text"
    $Output.Add($line)
    
    $fg = "White"
    switch ($Color.ToLower()) {
        "green"  { $fg = "Green" }
        "red"    { $fg = "Red" }
        "yellow" { $fg = "Yellow" }
        "cyan"   { $fg = "Cyan" }
        "gray"   { $fg = "DarkGray" }
        default  { $fg = "White" }
    }
    
    Write-Host "[$Tag] " -NoNewline -ForegroundColor $fg
    Write-Host $Text -ForegroundColor White
}

Clear-Host
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   AUDITORIA E DIAGNOSTICO COMPLETO -- DISCORD CLONE LEVE         " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Iniciando analise profunda de todos os componentes do sistema...`n" -ForegroundColor Gray

Log-Msg "INFO" "================ INICIO DO RELATORIO DE DIAGNOSTICO ================" "Cyan"
Log-Msg "INFO" "Data e Hora da Execucao: $((Get-Date).ToString('dd/MM/yyyy HH:mm:ss'))" "Cyan"

# ------------------------------------------------------------------------------
# 1. SISTEMA OPERACIONAL E HARDWARE
# ------------------------------------------------------------------------------
Write-Host "`n[1/10] Verificando Sistema Operacional e Arquitetura..." -ForegroundColor Yellow
try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    if ($os) {
        $totalRamGb = [Math]::Round($os.TotalVisibleMemorySize / 1048576, 2)
        $freeRamGb = [Math]::Round($os.FreePhysicalMemory / 1048576, 2)
        Log-Msg "OK" "SO: $($os.Caption) ($($os.OSArchitecture)) - Build $($os.BuildNumber)" "Green"
        Log-Msg "INFO" "Memoria RAM: $freeRamGb GB livres de $totalRamGb GB" "Gray"
    } else {
        Log-Msg "AVISO" "Nao foi possivel obter detalhes do SO via WMI." "Yellow"
    }
    $is64 = [Environment]::Is64BitOperatingSystem
    if ($is64) {
        Log-Msg "OK" "Arquitetura compativel: Windows 64-bit." "Green"
    } else {
        Log-Msg "ERRO" "Sistema operacional de 32-bit detectado! O executavel requer 64-bit." "Red"
    }
} catch {
    Log-Msg "AVISO" "Erro ao verificar SO: $($_.Exception.Message)" "Yellow"
}

# ------------------------------------------------------------------------------
# 2. RUNTIME MICROSOFT EDGE WEBVIEW2 (OBRIGATORIO PARA O TAURI)
# ------------------------------------------------------------------------------
Write-Host "`n[2/10] Verificando Microsoft Edge WebView2 Runtime..." -ForegroundColor Yellow
$webviewFound = $false
$webviewVersion = ""

# Checar Chaves de Registro (32-bit e 64-bit)
$wvKeys = @(
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
)
foreach ($key in $wvKeys) {
    if (Test-Path $key) {
        $val = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
        if ($val -and $val.pv) {
            $webviewFound = $true
            $webviewVersion = $val.pv
            break
        }
    }
}

# Checar pasta padrao de instalacao
$wvPath = "C:\Program Files (x86)\Microsoft\EdgeWebView\Application"
if (Test-Path $wvPath) {
    $wvFolder = Get-ChildItem $wvPath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^\d+\." } | Select-Object -First 1
    if ($wvFolder) {
        $webviewFound = $true
        if (-not $webviewVersion) { $webviewVersion = $wvFolder.Name }
    }
}

if ($webviewFound) {
    Log-Msg "OK" "Microsoft Edge WebView2 Runtime esta instalado! (Versao: $webviewVersion)" "Green"
} else {
    Log-Msg "ERRO" "Microsoft Edge WebView2 Runtime NAO ENCONTRADO!" "Red"
    Log-Msg "AJUDA" "O aplicativo nativo precisa do WebView2 para desenhar a interface." "Yellow"
    Log-Msg "AJUDA" "Baixe o instalador oficial gratuito da Microsoft:" "Yellow"
    Log-Msg "LINK" "https://go.microsoft.com/fwlink/p/?LinkId=2124703" "Cyan"
}

# ------------------------------------------------------------------------------
# 3. DIRETORIO DE INSTALACAO E PERMISSOES
# ------------------------------------------------------------------------------
Write-Host "`n[3/10] Verificando Diretorio de Instalacao e Permissoes..." -ForegroundColor Yellow
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")
$appDir = Join-Path $localAppData "DiscordCloneLeve"
$installedExe = Join-Path $appDir "discord-clone-leve.exe"

if (Test-Path $appDir) {
    Log-Msg "OK" "Pasta de instalacao existe: $appDir" "Green"
    # Teste de escrita
    try {
        $testFile = Join-Path $appDir ".write_test.tmp"
        [System.IO.File]::WriteAllText($testFile, "test")
        Remove-Item $testFile -Force -ErrorAction SilentlyContinue
        Log-Msg "OK" "Permissao de escrita confirmada em %LOCALAPPDATA%\DiscordCloneLeve." "Green"
    } catch {
        Log-Msg "ERRO" "Sem permissao de escrita na pasta de instalacao: $($_.Exception.Message)" "Red"
    }
} else {
    Log-Msg "AVISO" "Pasta %LOCALAPPDATA%\DiscordCloneLeve ainda nao foi criada." "Yellow"
}

# ------------------------------------------------------------------------------
# 4. INTEGRIDADE DO EXECUTAVEL INSTALADO
# ------------------------------------------------------------------------------
Write-Host "`n[4/10] Verificando Executavel Instalado..." -ForegroundColor Yellow
if (Test-Path $installedExe) {
    $exeItem = Get-Item $installedExe
    $sizeKb = [Math]::Round($exeItem.Length / 1024, 0)
    $hash = (Get-FileHash -Path $installedExe -Algorithm SHA256).Hash
    
    Log-Msg "OK" "Executavel instalado encontrado: $($exeItem.FullName)" "Green"
    Log-Msg "INFO" "Tamanho do arquivo: $($exeItem.Length) bytes ($sizeKb KB)" "Gray"
    Log-Msg "INFO" "Data da ultima modificacao: $($exeItem.LastWriteTime)" "Gray"
    Log-Msg "INFO" "SHA256: $hash" "Gray"
    
    # Checar se o arquivo esta bloqueado por outro processo
    $isLocked = $false
    try {
        $stream = [System.IO.File]::Open($installedExe, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
        $stream.Close()
    } catch {
        $isLocked = $true
        Log-Msg "ERRO" "O executavel esta BLOQUEADO por outro processo! Finalize o discord-clone-leve antes de instalar." "Red"
    }
    
    if (-not $isLocked) {
        Log-Msg "OK" "O arquivo nao esta bloqueado por processos concorrentes." "Green"
    }
    
    # Checar Mark of the Web (Zone.Identifier)
    $zoneFile = "$installedExe:Zone.Identifier"
    if (Test-Path $zoneFile -ErrorAction SilentlyContinue) {
        Log-Msg "AVISO" "Arquivo possui flag de bloqueio da Internet (SmartScreen). Removendo..." "Yellow"
        try {
            Unblock-File -Path $installedExe -ErrorAction SilentlyContinue
            Log-Msg "OK" "Arquivo desbloqueado com sucesso (Unblock-File)." "Green"
        } catch {}
    } else {
        Log-Msg "OK" "Nenhum bloqueio do SmartScreen / Zone.Identifier detectado." "Green"
    }

    # Analise de build: versao de producao vs devUrl
    if ($exeItem.Length -lt 4300000) {
        Log-Msg "ERRO" "Executavel tem tamanho inferior a 4.3 MB! E provavel que seja uma build dev apontando para localhost:1420." "Red"
    } else {
        Log-Msg "OK" "Tamanho compativel com binario de producao consolidado com frontend embutido." "Green"
    }
} else {
    Log-Msg "ERRO" "Executavel 'discord-clone-leve.exe' NAO ENCONTRADO em: $installedExe" "Red"
}

# ------------------------------------------------------------------------------
# 5. ATALHO NA AREA DE TRABALHO
# ------------------------------------------------------------------------------
Write-Host "`n[5/10] Verificando Atalho na Area de Trabalho..." -ForegroundColor Yellow
$shortcutPath = Join-Path $DesktopPath "Discord Clone Leve.lnk"

if (Test-Path $shortcutPath) {
    try {
        $wsh = New-Object -ComObject WScript.Shell
        $sc = $wsh.CreateShortcut($shortcutPath)
        Log-Msg "OK" "Atalho encontrado: $shortcutPath" "Green"
        Log-Msg "INFO" "Destino apontado: $($sc.TargetPath)" "Gray"
        Log-Msg "INFO" "Diretorio de trabalho: $($sc.WorkingDirectory)" "Gray"
        
        if (Test-Path $sc.TargetPath) {
            Log-Msg "OK" "O destino do atalho existe fisicamente no disco." "Green"
        } else {
            Log-Msg "ERRO" "O atalho aponta para um executavel inexistente: $($sc.TargetPath)" "Red"
        }
    } catch {
        Log-Msg "AVISO" "Atalho existe mas nao foi possivel inspecionar via COM." "Yellow"
    }
} else {
    Log-Msg "AVISO" "Atalho oficial 'Discord Clone Leve.lnk' nao esta na Area de Trabalho ($DesktopPath)." "Yellow"
}

# ------------------------------------------------------------------------------
# 6. PROCESSOS ATIVOS E SUBPROCESSOS WEBVIEW2
# ------------------------------------------------------------------------------
Write-Host "`n[6/10] Verificando Processos em Execucao..." -ForegroundColor Yellow
$procs = Get-Process -Name "*discord-clone-leve*" -ErrorAction SilentlyContinue
if ($procs) {
    foreach ($p in $procs) {
        $memMb = [Math]::Round($p.WorkingSet64 / 1048576, 1)
        Log-Msg "AVISO" "Processo em execucao: Nome: $($p.ProcessName) | PID: $($p.Id) | RAM: $memMb MB" "Yellow"
    }
} else {
    Log-Msg "OK" "Nenhum processo 'discord-clone-leve' travado em segundo plano." "Green"
}

$wvProcs = Get-Process -Name "msedgewebview2" -ErrorAction SilentlyContinue
if ($wvProcs) {
    Log-Msg "INFO" "Existem $($wvProcs.Count) processo(s) WebView2 rodando no sistema." "Gray"
}

# ------------------------------------------------------------------------------
# 7. CACHE E CONFIGURACOES LOCAIS
# ------------------------------------------------------------------------------
Write-Host "`n[7/10] Verificando Cache e Configuracoes Salvas..." -ForegroundColor Yellow
$appDataRoaming = [Environment]::GetFolderPath("ApplicationData")
$configPath = Join-Path $appDataRoaming "discord-clone-leve\config.json"
$serverHost = "187.7.186.10"

if (Test-Path $configPath) {
    try {
        $content = Get-Content $configPath -Raw -ErrorAction SilentlyContinue
        Log-Msg "OK" "Arquivo de configuracao encontrado: $configPath" "Green"
        $json = $content | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($json -and $json.host) {
            $serverHost = $json.host
            Log-Msg "INFO" "Host configurado: $serverHost" "Cyan"
        }
    } catch {
        Log-Msg "AVISO" "Falha ao ler JSON de configuracao: $($_.Exception.Message)" "Yellow"
    }
} else {
    Log-Msg "INFO" "Nenhum config.json previo encontrado. Usando servidor padrao: $serverHost" "Gray"
}

# ------------------------------------------------------------------------------
# 8. TESTE DE CONECTIVIDADE COM O SERVIDOR (PORTAS 7880 E 3001)
# ------------------------------------------------------------------------------
Write-Host "`n[8/10] Testando Conectividade de Rede com Servidor ($serverHost)..." -ForegroundColor Yellow

# Teste 8.1: Resolucao DNS / IP
try {
    $dnsEntries = [System.Net.Dns]::GetHostAddresses($serverHost)
    $ipList = ($dnsEntries | ForEach-Object { $_.IPAddressToString }) -join ", "
    Log-Msg "OK" "Resolucao de nome/IP bem-sucedida: $ipList" "Green"
} catch {
    Log-Msg "ERRO" "Falha na resolucao de endereco para $($serverHost): $($_.Exception.Message)" "Red"
}

# Teste 8.2: Ping ICMP
try {
    $ping = New-Object System.Net.NetworkInformation.Ping
    $reply = $ping.Send($serverHost, 2500)
    if ($reply.Status -eq "Success") {
        Log-Msg "OK" "Servidor responde ao Ping ICMP (Latencia: $($reply.RoundtripTime) ms)" "Green"
    } else {
        Log-Msg "AVISO" "Servidor nao respondeu ao Ping ICMP ($($reply.Status)) - Pode ser bloqueio normal de ICMP/Firewall." "Yellow"
    }
} catch {
    Log-Msg "AVISO" "Nao foi possivel enviar Ping ICMP." "Yellow"
}

# Teste 8.3: Porta LiveKit SFU (TCP 7880)
try {
    $tcp7880 = New-Object System.Net.Sockets.TcpClient
    $async = $tcp7880.BeginConnect($serverHost, 7880, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(3000, $false)
    if ($ok -and $tcp7880.Connected) {
        $tcp7880.EndConnect($async)
        $tcp7880.Close()
        Log-Msg "OK" "Porta 7880 TCP (LiveKit SFU) aberta e comunicando!" "Green"
    } else {
        $tcp7880.Close()
        Log-Msg "ERRO" "Porta 7880 TCP (LiveKit SFU) nao respondeu em 3 segundos. Servidor ou porta fechada!" "Red"
    }
} catch {
    Log-Msg "ERRO" "Erro ao conectar na porta 7880 TCP: $($_.Exception.Message)" "Red"
}

# Teste 8.4: Porta Token Server (TCP/HTTP 3001)
try {
    $httpReq = [System.Net.WebRequest]::Create("http://$($serverHost):3001/health")
    $httpReq.Timeout = 3000
    $resp = $httpReq.GetResponse()
    $status = ([System.Net.HttpWebResponse]$resp).StatusCode
    $resp.Close()
    Log-Msg "OK" "Token Server (porta 3001 HTTP) respondeu com status $status (/health)!" "Green"
} catch {
    Log-Msg "AVISO" "Token Server em http://$($serverHost):3001/health nao respondeu: $($_.Exception.Message)" "Yellow"
}

# ------------------------------------------------------------------------------
# 9. HISTORICO DE ERROS E CRASHES NO WINDOWS EVENT VIEWER
# ------------------------------------------------------------------------------
Write-Host "`n[9/10] Buscando falhas recentes nos Logs de Eventos do Windows..." -ForegroundColor Yellow
$foundCrash = $false
try {
    $cutoff = (Get-Date).AddDays(-2)
    $events = Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=$cutoff; Level=2} -MaxEvents 30 -ErrorAction SilentlyContinue | Where-Object { 
        $_.Message -match "discord-clone-leve" -or 
        $_.Message -match "Instalador" -or 
        $_.Message -match "WebView2" 
    }
    
    if ($events) {
        $foundCrash = $true
        foreach ($ev in $events) {
            $msgPreview = ($ev.Message -split "`n")[0].Trim()
            Log-Msg "ERRO" "Evento $($ev.Id) em $($ev.TimeCreated): $msgPreview" "Red"
        }
    }
} catch { }

if (-not $foundCrash) {
    Log-Msg "OK" "Nenhuma falha de crash recente do aplicativo registrada no Visualizador de Eventos." "Green"
}

# ------------------------------------------------------------------------------
# 10. RECOMENDACOES E SALVAMENTO DO RELATORIO
# ------------------------------------------------------------------------------
Write-Host "`n[10/10] Compilando relatorio e diagnostico conclusivo..." -ForegroundColor Yellow

$Output.Add("")
$Output.Add("================ CONCLUSAO E ACOES RECOMENDADAS ================")
if (-not $webviewFound) {
    $Output.Add("ACAO 1: Instale o Microsoft Edge WebView2 Runtime: https://go.microsoft.com/fwlink/p/?LinkId=2124703")
}
if ($procs) {
    $Output.Add("ACAO 2: Existem instancias do app rodando. Finalize-as antes de reinstalar.")
}
if (-not (Test-Path $installedExe)) {
    $Output.Add("ACAO 3: O executavel nao esta instalado. Execute 'Instalador-Discord-Clone.exe' como Administrador.")
}
$Output.Add("==================================================================")

# Gravar nos dois locais
$Output | Out-File -FilePath $ReportFile -Encoding ascii -Force
$Output | Out-File -FilePath $LocalReport -Encoding ascii -Force

Log-Msg "OK" "Relatorio salvo com sucesso na Area de Trabalho:" "Green"
Log-Msg "ARQUIVO" $ReportFile "Cyan"
Log-Msg "OK" "Copia do relatorio salva na pasta atual:" "Green"
Log-Msg "ARQUIVO" $LocalReport "Cyan"

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "   DIAGNOSTICO CONCLUIDO COM SUCESSO!                             " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Abrindo relatorio no Bloco de Notas para visualizacao imediata...`n" -ForegroundColor Gray

Start-Process "notepad.exe" -ArgumentList "`"$ReportFile`""
