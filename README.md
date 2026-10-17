# 🖥️ Discord Clone Leve — Cliente Desktop

Aplicativo nativo leve para Windows com chat de texto, canais de voz de baixa latência e compartilhamento de tela em tempo real via LiveKit WebRTC e Tauri v2.

---

## 🚀 Instalação Rápida no Computador do Cliente

### Opção 1: Instalador Automático em 1 Clique (Recomendado)
1. Dê um duplo clique no arquivo **`instalar-cliente.bat`**.
2. O script irá:
   - Instalar dependências npm (`npm install`);
   - Compilar o executável nativo otimizado (`npm run tauri build`);
   - **Criar automaticamente o atalho "Discord Clone Leve" na sua Área de Trabalho** com o ícone oficial!

### Opção 2: Criar Apenas o Atalho (Se já compilado ou portátil)
1. Dê um duplo clique no arquivo **`criar-atalho.bat`**.
2. O atalho apontando para o executável será criado na Área de Trabalho imediatamente.

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
