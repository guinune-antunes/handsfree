/**
 * Token Server for LiveKit — Discord Clone Leve
 *
 * Generates JWT access tokens for LiveKit rooms.
 * Run this on the same server as LiveKit, or locally for development.
 *
 * Usage:
 *   node token-server.js
 *
 * Environment variables (or edit the defaults below):
 *   LIVEKIT_API_KEY    - Your LiveKit API Key
 *   LIVEKIT_API_SECRET - Your LiveKit API Secret
 *   PORT               - Server port (default: 3001)
 */

const http = require('http');
const crypto = require('crypto');

// ====== CONFIGURATION ======
const API_KEY = process.env.LIVEKIT_API_KEY || 'COLOQUE_SUA_API_KEY';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'COLOQUE_SEU_API_SECRET';
const PORT = process.env.PORT || 3001;

// ====== JWT TOKEN GENERATION ======

function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateToken(roomName, identity, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (options.ttl || 86400); // 24 hours default

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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Token endpoint
  if (req.method === 'POST' && req.url === '/api/token') {
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

        console.log(`[Token] Generated for "${identity}" in room "${room}"`);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to generate token' }));
        console.error('[Token] Error:', err.message);
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔑 LiveKit Token Server running on port ${PORT}`);
  console.log(`   API Key: ${API_KEY.substring(0, 8)}...`);
  console.log(`   Endpoint: POST http://0.0.0.0:${PORT}/api/token`);
  console.log(`   Health:   GET  http://0.0.0.0:${PORT}/health\n`);
});
