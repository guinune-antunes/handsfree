/* ============================================
   DATA — Discord Clone Leve
   Estrutura limpa sem dados fictícios.
   Apenas canais padrão e helpers.
   ============================================ */

import type { Member, Channel, Message } from '../types';

// Membros reais vazios por padrão (preenchidos dinamicamente)
export const MOCK_MEMBERS: Member[] = [];

// Canais padrão limpos do servidor
export const MOCK_CHANNELS: Channel[] = [
  {
    id: 'ch-text-1',
    name: 'geral',
    type: 'text',
    description: 'Canal de texto principal',
    connectedMembers: [],
  },
  {
    id: 'ch-text-2',
    name: 'jogos',
    type: 'text',
    description: 'Discussão e jogatinas',
    connectedMembers: [],
  },
  {
    id: 'ch-voice-1',
    name: 'Sala 1',
    type: 'voice',
    description: 'Canal de voz 1',
    connectedMembers: [],
  },
  {
    id: 'ch-voice-2',
    name: 'Sala 2',
    type: 'voice',
    description: 'Canal de voz 2',
    connectedMembers: [],
  },
];

// Mensagens vazias para chat limpo
export const MOCK_MESSAGES: Message[] = [];

// --- Helpers ---
export function getMemberById(_id: string): Member | undefined {
  return undefined;
}

export function getMessagesForChannel(channelId: string): Message[] {
  return MOCK_MESSAGES.filter((m) => m.channelId === channelId);
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const clean = name.replace(/\(Você\)/gi, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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
