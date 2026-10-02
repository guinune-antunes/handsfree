/* ============================================
   MOCK DATA — Discord Clone Leve
   Dados fictícios para desenvolvimento.
   Será substituído por dados reais do servidor.
   ============================================ */

import type { Member, Channel, Message } from '../types';

// --- Membros (8 amigos fixos) ---
export const MOCK_MEMBERS: Member[] = [
  {
    id: 'user-1',
    name: 'Xandão',
    avatar: '',
    status: 'online',
    isMuted: false,
    isDeafened: false,
    isStreaming: false,
  },
  {
    id: 'user-2',
    name: 'Luan',
    avatar: '',
    status: 'online',
    isMuted: true,
    isDeafened: false,
    isStreaming: false,
  },
  {
    id: 'user-3',
    name: 'Bruna',
    avatar: '',
    status: 'online',
    isMuted: false,
    isDeafened: false,
    isStreaming: false,
  },
  {
    id: 'user-4',
    name: 'Matheus',
    avatar: '',
    status: 'idle',
    isMuted: false,
    isDeafened: false,
    isStreaming: false,
  },
  {
    id: 'user-5',
    name: 'Rafaela',
    avatar: '',
    status: 'online',
    isMuted: false,
    isDeafened: true,
    isStreaming: false,
  },
  {
    id: 'user-6',
    name: 'Pedro',
    avatar: '',
    status: 'dnd',
    isMuted: false,
    isDeafened: false,
    isStreaming: false,
  },
  {
    id: 'user-7',
    name: 'Juliana',
    avatar: '',
    status: 'offline',
    isMuted: false,
    isDeafened: false,
    isStreaming: false,
  },
  {
    id: 'user-8',
    name: 'Gustavo',
    avatar: '',
    status: 'offline',
    isMuted: false,
    isDeafened: false,
    isStreaming: false,
  },
];

// --- Canais (2 texto + 2 voz) ---
export const MOCK_CHANNELS: Channel[] = [
  {
    id: 'ch-text-1',
    name: 'geral',
    type: 'text',
    description: 'Conversa geral do grupo',
    connectedMembers: [],
  },
  {
    id: 'ch-text-2',
    name: 'jogos',
    type: 'text',
    description: 'Discussão sobre games',
    connectedMembers: [],
  },
  {
    id: 'ch-voice-1',
    name: 'Sala 1',
    type: 'voice',
    description: '',
    connectedMembers: [],
  },
  {
    id: 'ch-voice-2',
    name: 'Sala 2',
    type: 'voice',
    description: '',
    connectedMembers: [],
  },
];

// --- Mensagens de exemplo ---
const now = Date.now();
const minute = 60_000;

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    authorId: 'user-1',
    authorName: 'Xandão',
    authorAvatar: '',
    content: 'Fala galera! Quem vai jogar hoje?',
    timestamp: now - 45 * minute,
    channelId: 'ch-text-1',
  },
  {
    id: 'msg-2',
    authorId: 'user-2',
    authorName: 'Luan',
    authorAvatar: '',
    content: 'Bora! Tô online já',
    timestamp: now - 44 * minute,
    channelId: 'ch-text-1',
  },
  {
    id: 'msg-3',
    authorId: 'user-3',
    authorName: 'Bruna',
    authorAvatar: '',
    content: 'Eu entro daqui a pouco, tô terminando de comer 🍕',
    timestamp: now - 42 * minute,
    channelId: 'ch-text-1',
  },
  {
    id: 'msg-4',
    authorId: 'user-1',
    authorName: 'Xandão',
    authorAvatar: '',
    content: 'Show! Vou streamar a tela pra vocês verem o jogo novo',
    timestamp: now - 40 * minute,
    channelId: 'ch-text-1',
  },
  {
    id: 'msg-5',
    authorId: 'user-5',
    authorName: 'Rafaela',
    authorAvatar: '',
    content: 'Que jogo?',
    timestamp: now - 38 * minute,
    channelId: 'ch-text-1',
  },
  {
    id: 'msg-6',
    authorId: 'user-1',
    authorName: 'Xandão',
    authorAvatar: '',
    content: 'Valorant, rankeada! Quero subir de elo hoje',
    timestamp: now - 37 * minute,
    channelId: 'ch-text-1',
  },
  {
    id: 'msg-7',
    authorId: 'user-4',
    authorName: 'Matheus',
    authorAvatar: '',
    content: 'Boa sorte kkk ontem tu tomou uma surra',
    timestamp: now - 35 * minute,
    channelId: 'ch-text-1',
  },
  {
    id: 'msg-8',
    authorId: 'user-1',
    authorName: 'Xandão',
    authorAvatar: '',
    content: 'Hoje é diferente 😤',
    timestamp: now - 34 * minute,
    channelId: 'ch-text-1',
  },
  {
    id: 'msg-9',
    authorId: 'user-6',
    authorName: 'Pedro',
    authorAvatar: '',
    content: 'Alguém testou aquele novo mapa?',
    timestamp: now - 20 * minute,
    channelId: 'ch-text-2',
  },
  {
    id: 'msg-10',
    authorId: 'user-2',
    authorName: 'Luan',
    authorAvatar: '',
    content: 'Sim! Achei muito bom, a rotação do mid ficou mais rápida',
    timestamp: now - 18 * minute,
    channelId: 'ch-text-2',
  },
  {
    id: 'msg-11',
    authorId: 'user-3',
    authorName: 'Bruna',
    authorAvatar: '',
    content: 'Concordo, o spawn ficou melhor também',
    timestamp: now - 15 * minute,
    channelId: 'ch-text-2',
  },
];

// --- Helpers ---
export function getMemberById(id: string): Member | undefined {
  return MOCK_MEMBERS.find((m) => m.id === id);
}

export function getMessagesForChannel(channelId: string): Message[] {
  return MOCK_MESSAGES.filter((m) => m.channelId === channelId);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return `Hoje às ${time}`;
  }

  return `${date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${time}`;
}
