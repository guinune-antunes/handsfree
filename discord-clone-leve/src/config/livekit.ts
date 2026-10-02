/* ============================================
   LIVEKIT CONFIG — Discord Clone Leve
   ============================================ */

/**
 * Build the LiveKit WebSocket URL from host and port.
 * Without SSL we use ws://, with SSL (domain) we'd use wss://
 */
export function getLiveKitUrl(host: string, port: number): string {
  // If the host already includes a protocol, use it as-is
  if (host.startsWith('ws://') || host.startsWith('wss://')) {
    return host;
  }
  // Default to ws:// (no SSL) for development
  return `ws://${host}:${port}`;
}

/**
 * Token server URL — this is the endpoint that generates JWT tokens
 * for LiveKit authentication. Should point to your token server.
 */
export function getTokenServerUrl(host: string): string {
  // The token server runs on port 7881 on the same host as LiveKit
  // In production, this could be a separate endpoint
  return `http://${host}:7880`;
}

/**
 * Fetch a LiveKit access token from the token server.
 */
export async function fetchLiveKitToken(
  tokenServerUrl: string,
  roomName: string,
  identity: string
): Promise<string> {
  const response = await fetch(`${tokenServerUrl}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: roomName, identity }),
  });

  if (!response.ok) {
    throw new Error(`Token server error: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}
