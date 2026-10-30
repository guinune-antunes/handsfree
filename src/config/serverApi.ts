/* ============================================
   SERVER API — Shelter
   Sincronização em tempo real de presença de operadores,
   salas de voz ativas e mensagens de chat via token-server (porta 3001)
   ============================================ */

export interface RemoteOperator {
  name: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  isVoiceConnected: boolean;
  voiceChannelId: string | null;
}

export interface PresenceResponse {
  operators: RemoteOperator[];
  voiceRooms: Record<string, string[]>;
}

export interface RemoteChatMessage {
  id: string;
  channelId: string;
  authorName: string;
  content: string;
  timestamp: number;
}

function getServerBaseUrl(host: string): string {
  // O token-server roda na porta 3001
  const cleanHost = host.trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
  return `http://${cleanHost}:3001`;
}

/** Envia heartbeat de presença e retorna quem está online e em call */
export async function syncPresence(
  host: string,
  data: {
    nickname: string;
    isVoiceConnected: boolean;
    voiceChannelId: string | null;
  }
): Promise<PresenceResponse | null> {
  if (!host) return null;
  const url = `${getServerBaseUrl(host)}/api/presence`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    return (await res.json()) as PresenceResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Envia uma mensagem para o canal no servidor */
export async function sendServerMessage(
  host: string,
  data: {
    channelId: string;
    authorName: string;
    content: string;
  }
): Promise<RemoteChatMessage | null> {
  if (!host || !data.content.trim()) return null;
  const url = `${getServerBaseUrl(host)}/api/messages`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; message: RemoteChatMessage };
    return body.message;
  } catch (err) {
    console.warn('[ServerAPI] Falha ao enviar mensagem ao servidor:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Busca mensagens do canal no servidor */
export async function fetchServerMessages(
  host: string,
  channelId?: string,
  since: number = 0
): Promise<RemoteChatMessage[]> {
  if (!host) return [];
  const query = new URLSearchParams();
  if (channelId) query.set('channelId', channelId);
  if (since > 0) query.set('since', String(since));

  const url = `${getServerBaseUrl(host)}/api/messages?${query.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) return [];
    const list = (await res.json()) as RemoteChatMessage[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
