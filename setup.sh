#!/usr/bin/env bash
# ========================================================
# Setup Automático do Servidor — Discord Clone Leve
# Compatível com Debian, Ubuntu e derivados Linux
# ========================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}    🚀 Discord Clone Leve — Instalação do Servidor   ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERRO] Docker não foi encontrado!${NC}"
    echo -e "Por favor, instale o Docker antes de continuar: https://docs.docker.com/engine/install/"
    exit 1
fi

# 2. Detectar IP público ou local
echo -e "\n${YELLOW}[1/4] Detectando endereço IP do servidor...${NC}"
DETECTED_IP=$(curl -s4 --connect-timeout 3 ifconfig.me || curl -s4 --connect-timeout 3 icanhazip.com || hostname -I | awk '{print $1}')
if [ -z "$DETECTED_IP" ]; then
    DETECTED_IP="127.0.0.1"
fi
echo -e "IP detectado: ${GREEN}${DETECTED_IP}${NC}"

read -r -p "Pressione ENTER para usar esse IP ou digite outro endereço: " INPUT_IP
SERVER_IP=${INPUT_IP:-$DETECTED_IP}

# 3. Gerar chaves aleatórias se não existirem
echo -e "\n${YELLOW}[2/4] Gerando credenciais seguras para o LiveKit...${NC}"
if [ ! -f .env ]; then
    API_KEY=$(openssl rand -hex 16 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-' | cut -c1-16)
    API_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-')
    
    cat <<EOF > .env
LIVEKIT_API_KEY=${API_KEY}
LIVEKIT_API_SECRET=${API_SECRET}
PUBLIC_IP=${SERVER_IP}
EOF
    echo -e "Arquivo ${GREEN}.env${NC} criado com sucesso!"
else
    echo -e "Arquivo ${GREEN}.env${NC} já existente, mantendo credenciais atuais."
    # shellcheck disable=SC1091
    source .env
    API_KEY=${LIVEKIT_API_KEY}
    API_SECRET=${LIVEKIT_API_SECRET}
fi

# 4. Atualizar livekit.yaml
echo -e "\n${YELLOW}[3/4] Configurando livekit.yaml...${NC}"
cat <<EOF > livekit.yaml
# LiveKit Server Configuration — Gerado por setup.sh
port: 7880
log_level: info

rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  node_ip: ${SERVER_IP}
  use_external_ip: true

redis:
  address: 127.0.0.1:6379

keys:
  ${API_KEY}: ${API_SECRET}

turn:
  enabled: true
  udp_port: 3478
EOF
echo -e "${GREEN}livekit.yaml atualizado com sucesso!${NC}"

# 5. Iniciar containers
echo -e "\n${YELLOW}[4/4] Limpando eventuais conflitos e iniciando serviços...${NC}"

# Parar serviços do compose atual se estiverem rodando
docker compose down 2>/dev/null || true

# Forçar remoção de containers antigos/conflitantes que possam estar presos no daemon
echo -e "Liberando portas e removendo containers residuais..."
docker rm -f livekit-redis livekit-server livekit-token-server 2>/dev/null || true

# Subir com recriação forçada
echo -e "Subindo LiveKit, Redis e Token Server via Docker Compose..."
docker compose up -d --remove-orphans --force-recreate

# Aguardar 3 segundos e inspecionar status
sleep 3
echo -e "\n${YELLOW}Status dos containers em execução:${NC}"
docker compose ps

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}    ✅ Servidor configurado e em execução!           ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "📌 Dados para conectar o aplicativo cliente:"
echo -e "   • Host / IP:      ${GREEN}${SERVER_IP}${NC}"
echo -e "   • Porta LiveKit:  ${GREEN}7880${NC}"
echo -e "   • Token Server:   ${GREEN}http://${SERVER_IP}:3001${NC}"
echo -e "\n🔍 Comandos úteis:"
echo -e "   • Ver status:   docker compose ps"
echo -e "   • Ver logs:     docker compose logs -f"
echo -e "   • Parar:        docker compose down"
echo -e "=====================================================\n"
