/**
 * Token Server & State Sync for LiveKit — Shelter
 *
 * Funcionalidades:
 * 1. Gera tokens JWT de acesso para salas LiveKit (/api/token)
 * 2. Rastreamento de Presença em Tempo Real (/api/presence)
 *    - Detecta operadores online e quem está em qual sala de voz
 * 3. Sincronização de Chat de Texto entre Todos os Usuários (/api/messages)
 *    - Armazena histórico persistente de mensagens por canal
 *
 * Dependências: Apenas Node.js nativo (sem npm install)
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ====== CONFIGURAÇÃO ======
const API_KEY = process.env.LIVEKIT_API_KEY || 'COLOQUE_SUA_API_KEY';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'COLOQUE_SEU_API_SECRET';
const PORT = process.env.PORT || 3001;
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// ====== ESTADO EM MEMÓRIA ======
// nickname -> { nickname, isVoiceConnected, voiceChannelId, lastSeen }
const operators = new Map();

// Array de mensagens: [{ id, channelId, authorName, content, timestamp }]
let messagesStore = [];

// Carrega histórico anterior se existir
try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const raw = fs.readFileSync(MESSAGES_FILE, 'utf8');
    messagesStore = JSON.parse(raw);
    console.log(`[Storage] ${messagesStore.length} mensagens carregadas do disco.`);
  }
} catch (e) {
  console.warn('[Storage] Não foi possível ler messages.json:', e.message);
}

// Salva mensagens em disco com debounce
let saveTimeout = null;
function persistMessages() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messagesStore.slice(-500), null, 2), 'utf8');
    } catch (e) {
      console.warn('[Storage] Falha ao persistir messages.json:', e.message);
    }
  }, 2000);
}

// ====== LIMPEZA DE OPERADORES INATIVOS ======
function cleanStaleOperators() {
  const now = Date.now();
  for (const [nick, op] of operators.entries()) {
    // 12 segundos sem heartbeat = offline
    if (now - op.lastSeen > 12000) {
      operators.delete(nick);
      console.log(`[Presence] Operador "${nick}" desconectado por inatividade.`);
    }
  }
}
setInterval(cleanStaleOperators, 4000);

function getPresenceSnapshot() {
  cleanStaleOperators();

  const opsList = [];
  const voiceRooms = {};

  for (const op of operators.values()) {
    opsList.push({
      name: op.nickname,
      status: 'online',
      isVoiceConnected: op.isVoiceConnected,
      voiceChannelId: op.voiceChannelId,
    });

    if (op.isVoiceConnected && op.voiceChannelId) {
      if (!voiceRooms[op.voiceChannelId]) {
        voiceRooms[op.voiceChannelId] = [];
      }
      voiceRooms[op.voiceChannelId].push(op.nickname);
    }
  }

  return { operators: opsList, voiceRooms };
}

// ====== GERAÇÃO DE TOKEN JWT (LIVEKIT) ======

function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateToken(roomName, identity, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (options.ttl || 86400); // 24 horas

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    iss: API_KEY,
    sub: identity,
    iat: now,
    exp: exp,
    nbf: now,
    jti: crypto.randomUUID(),
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    metadata: '',
    name: identity,
  };

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const signatureB64 = base64url(signature);

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// ====== HTTP SERVER ======

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Health check
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'shelter-hub' }));
    return;
  }

  // 2. Token LiveKit
  if (req.method === 'POST' && pathname === '/api/token') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { room, identity } = JSON.parse(body);

        if (!room || !identity) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'room and identity are required' }));
          return;
        }

        const token = generateToken(room, identity);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token }));

        console.log(`[Token] Gerado para "${identity}" na sala "${room}"`);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to generate token' }));
      }
    });
    return;
  }

  // 3. Presença de Operadores & Salas de Voz (/api/presence)
  if (pathname === '/api/presence') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getPresenceSnapshot()));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { nickname, isVoiceConnected, voiceChannelId } = JSON.parse(body);
          if (nickname && nickname.trim()) {
            operators.set(nickname.trim(), {
              nickname: nickname.trim(),
              isVoiceConnected: Boolean(isVoiceConnected),
              voiceChannelId: voiceChannelId || null,
              lastSeen: Date.now(),
            });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(getPresenceSnapshot()));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // 4. Mensagens de Chat (/api/messages)
  if (pathname === '/api/messages') {
    if (req.method === 'GET') {
      const channelId = parsedUrl.searchParams.get('channelId');
      const since = parseInt(parsedUrl.searchParams.get('since') || '0', 10);

      let list = messagesStore;
      if (channelId) {
        list = list.filter(m => m.channelId === channelId);
      }
      if (since > 0) {
        list = list.filter(m => m.timestamp > since);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { channelId, authorName, content } = JSON.parse(body);

          if (!content || !content.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'content is required' }));
            return;
          }

          const newMsg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            channelId: channelId || 'text-1',
            authorName: (authorName || 'Operador').trim(),
            content: content.trim(),
            timestamp: Date.now(),
          };

          messagesStore.push(newMsg);
          if (messagesStore.length > 500) {
            messagesStore.shift();
          }
          persistMessages();

          console.log(`[Chat] [${newMsg.channelId}] ${newMsg.authorName}: ${newMsg.content.slice(0, 40)}`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: newMsg }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to save message' }));
        }
      });
      return;
    }
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=======================================================`);
  console.log(`🚀 Shelter Hub & Token Server rodando na porta ${PORT}`);
  console.log(`   • LiveKit Token: POST http://0.0.0.0:${PORT}/api/token`);
  console.log(`   • Presença Real: POST/GET http://0.0.0.0:${PORT}/api/presence`);
  console.log(`   • Mensagens Chat: POST/GET http://0.0.0.0:${PORT}/api/messages`);
  console.log(`   • Health Check:  GET  http://0.0.0.0:${PORT}/health`);
  console.log(`=======================================================\n`);
});
