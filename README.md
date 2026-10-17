# 🖥️ Discord Clone Leve — Cliente Desktop

Aplicativo nativo leve para Windows com chat de texto, canais de voz de baixa latência e compartilhamento de tela em tempo real via LiveKit WebRTC e Tauri v2.

---

## 🚀 Instalação Rápida no Computador do Cliente

### ⚡ Opção 1: Instalador Executável Standalone (Recomendado)
Basta dar um duplo clique no arquivo **`Instalador-Discord-Clone.exe`**!
- ✅ **Não precisa instalar Node.js, Rust nem Git**;
- 🎨 Interface visual animada durante a instalação;
- 📌 Cria automaticamente o atalho oficial **"Discord Clone Leve"** na sua Área de Trabalho;
- 🚀 Inicia o aplicativo diretamente após a instalação.

---

### 🔍 Resolução de Problemas e Diagnóstico Sem Lacunas
Se encontrar qualquer problema de inicialização, atalho ou rede, basta dar um duplo clique em:
👉 **`diagnostico.bat`**

O script analisa automaticamente 10 camadas do sistema:
1. Versão e arquitetura do Windows
2. Runtime Microsoft Edge WebView2
3. Permissões de escrita e integridade dos arquivos
4. Hash SHA256 do executável e integridade dos pacotes
5. Atalho da Área de Trabalho e seus caminhos
6. Processos concorrentes ou bloqueios de arquivo
7. Arquivos de configuração salvos
8. Teste de conectividade real com o servidor (Porta 7880 SFU e 3001 Token Server)
9. Histórico de falhas e crashes no Visualizador de Eventos do Windows
10. Geração e abertura automática do relatório `DIAGNOSTICO_DISCORD_CLONE.txt`

---

### Opção 2: Compilar a partir do Código Fonte (Desenvolvedores)
1. Instale as dependências: `npm install`
2. Compile o aplicativo: `npm run tauri build`
3. Execute `criar-atalho.bat` para gerar o atalho no Desktop.

---

## 🛠️ Executar em Modo de Desenvolvimento

Caso deseje rodar e testar em tempo real:

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar em modo dev com Live Reload
npm run tauri dev
```

---

## 📁 Estrutura de Pastas

```
.
├── instalar-cliente.bat   # Script automático de instalação e criação de atalho
├── criar-atalho.bat       # Wrapper do script de atalho para duplo clique
├── criar-atalho.ps1       # Script PowerShell que cria o atalho no Desktop
├── src/                   # Interface React (Dashboard, Canais, Voz, Configurações)
├── src-tauri/             # Backend nativo Rust (Tauri v2, TCP validation, persistência)
├── package.json           # Dependências e scripts npm
├── vite.config.ts         # Configuração do Vite dev server
└── relatorio_tecnico.html # Relatório técnico completo de arquitetura
```

---

## 🔌 Como Conectar ao Servidor

1. Abra o aplicativo pelo atalho na Área de Trabalho.
2. Na tela de login, insira:
   - **Endereço IP / Host:** O IP ou domínio do servidor (ex: `192.168.1.7` ou `meuservidor.com`).
   - **Porta:** `7880` (padrão).
   - **Apelido:** Seu nome de usuário.
3. Clique em **Conectar**. O app validará a conexão via TCP nativo, salvará suas configurações para as próximas vezes e entrará no painel principal!
