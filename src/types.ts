/* ============================================
   TYPES — Discord Clone Leve
   ============================================ */

export type Screen = 'login' | 'dashboard';

export type ChannelType = 'text' | 'voice';

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface AppConfig {
  host: string;
  port: number;
  nickname: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  status: UserStatus;
  isMuted: boolean;
  isDeafened: boolean;
  isStreaming: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  connectedMembers: string[]; // member IDs
}

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: number;
  channelId: string;
}

export interface VoiceState {
  isConnected: boolean;
  channelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface StreamState {
  isActive: boolean;
  streamerId: string | null;
  type: 'screen' | 'camera' | null;
}

export interface StreamQualityPreset {
  id: string;
  label: string;
  resolution: string;
  fps: number;
  width: number;
  height: number;
  bitrate: number;
}

export interface ActiveStream {
  participantId: string;
  participantName: string;
  track: MediaStreamTrack;
  isLocal: boolean;
  qualityLabel?: string;
}

export interface AppState {
  screen: Screen;
  config: AppConfig;
  currentChannelId: string;
  channels: Channel[];
  members: Member[];
  messages: Message[];
  voiceState: VoiceState;
  streamState: StreamState;
  settingsOpen: boolean;
}
