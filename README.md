# 🚀 Discord Clone Leve

Aplicação completa de comunicação em tempo real de altíssima performance inspirada no Discord, desenvolvida com **Tauri v2 + React 19** no cliente e **LiveKit SFU + Redis + Node.js** no servidor.

---

## 🌿 Branches do Projeto

Este repositório foi organizado em branches separadas para facilitar a instalação e manutenção em diferentes ambientes:

| Branch | Finalidade | Ambiente | Comando de Clone |
| :--- | :--- | :--- | :--- |
| **`server`** | Infraestrutura completa do servidor (LiveKit + Redis + Token Server + Docker + script de auto-setup). | Servidor Linux (Debian/Ubuntu) | `git clone -b server https://github.com/guinune-antunes/handsfree.git discord-server` |
| **`client`** | Aplicativo nativo desktop leve, scripts de instalação em 1 clique e gerador de atalho na Área de Trabalho. | PC do Usuário (Windows) | `git clone -b client https://github.com/guinune-antunes/handsfree.git discord-client` |
| **`main`** | Código fonte unificado e documentação técnica completa. | Desenvolvimento Geral | `git clone https://github.com/guinune-antunes/handsfree.git` |

---

## ⚡ Como Instalar no Servidor (Linux / Debian / Ubuntu)

No seu servidor, basta executar:

```bash
git clone -b server https://github.com/guinune-antunes/handsfree.git discord-server
cd discord-server
chmod +x setup.sh
./setup.sh
```

O `setup.sh` detecta seu IP automaticamente, gera as credenciais seguras e sobe os containers do LiveKit, Redis e Token Server em segundo plano.

---

## 💻 Como Instalar no PC do Cliente (Windows)

No computador do usuário:

1. Clone ou baixe a branch `client`:
   ```bash
   git clone -b client https://github.com/guinune-antunes/handsfree.git discord-client
   ```
2. Abra a pasta e dê um duplo clique no arquivo:
   👉 **`instalar-cliente.bat`**

O instalador instalará as dependências, compilará o executável nativo leve e **criará automaticamente o atalho "Discord Clone Leve" na Área de Trabalho** do usuário.

---

## 📋 Documentação Técnica Completa

Para visualizar a análise de arquitetura, fluxo WebRTC, diagramas e matriz de protocolos, abra o arquivo:
- [`relatorio_tecnico.html`](./discord-clone-leve/relatorio_tecnico.html) no seu navegador.
