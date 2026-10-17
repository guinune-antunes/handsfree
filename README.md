# 🖧 Discord Clone Leve — Servidor (Server-Side)

Recursos e configurações necessárias para hospedar o servidor LiveKit SFU, Redis e o Token Server em uma máquina Linux (Debian, Ubuntu, etc).

---

## ⚡ Instalação Rápida (1 Comando)

No seu servidor Linux, execute:

```bash
git clone -b server https://github.com/guinune-antunes/handsfree.git discord-server
cd discord-server
chmod +x setup.sh
./setup.sh
```

O script `setup.sh` irá automaticamente:
1. Detectar o IP público ou local do servidor;
2. Gerar chaves aleatórias e seguras (API Key e Secret) no arquivo `.env`;
3. Configurar o `livekit.yaml` adequadamente;
4. Iniciar os 3 containers (LiveKit SFU + Redis + Token Server) via Docker Compose.

---

## 📦 Estrutura de Arquivos

```
.
├── docker-compose.yml   # Orquestração do LiveKit (host), Redis (bridge) e Token Server
├── livekit.yaml         # Configuração RTC, portas, TURN e chaves do LiveKit
├── token-server.js      # Servidor HTTP Node.js (porta 3001) para geração de JWT
├── .env.example         # Exemplo de variáveis de ambiente
├── setup.sh             # Script de instalação e inicialização automática
└── README.md            # Este guia
```

---

## 🌐 Portas Necessárias no Firewall (UFW / Roteador)

Certifique-se de liberar as seguintes portas:

```bash
# Sinalização WebSocket e API LiveKit
sudo ufw allow 7880/tcp

# Conexão WebRTC TCP (fallback)
sudo ufw allow 7881/tcp

# Token Server HTTP
sudo ufw allow 3001/tcp

# TURN Server (NAT traversal)
sudo ufw allow 3478/udp

# Mídia WebRTC (Áudio, Vídeo e Screen Share)
sudo ufw allow 50000:60000/udp
```

---

## 🛠️ Comandos de Gerenciamento

```bash
# Ver status dos serviços
docker compose ps

# Ver logs em tempo real
docker compose logs -f

# Reiniciar serviços
docker compose restart

# Parar serviços
docker compose down
```
