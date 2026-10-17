import type { RefObject } from 'react';
import type { Channel, Member, Message, VoiceState, StreamState, ActiveStream } from '../types';
import type { LiveKitParticipant } from '../hooks/useLiveKit';
import ChannelSidebar from './ChannelSidebar';
import ChatPanel from './ChatPanel';
import StageView from './StageView';
import MembersList from './MembersList';
import UserBar from './UserBar';
import './Dashboard.css';

interface DashboardProps {
  nickname: string;
  channels: Channel[];
  members: Member[];
  messages: Message[];
  currentChannelId: string;
  voiceState: VoiceState;
  streamState: StreamState;
  activeScreenTrack?: MediaStreamTrack | null;
  activeStreams?: ActiveStream[];
  isMuted: boolean;
  isDeafened: boolean;
  onChannelSelect: (channelId: string) => void;
  onVoiceConnect: (channelId: string) => void;
  onVoiceDisconnect: () => void;
  onSendMessage: (content: string) => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenSettings: () => void;
  onStartStream: () => void;
  onStopStream: () => void;
  onOpenStreamQuality?: () => void;
  liveKitParticipants?: LiveKitParticipant[];
  screenVideoRef?: RefObject<HTMLVideoElement | null>;
}

export default function Dashboard({
  nickname,
  channels,
  members,
  messages,
  currentChannelId,
  voiceState,
  streamState,
  activeScreenTrack,
  activeStreams,
  isMuted,
  isDeafened,
  onChannelSelect,
  onVoiceConnect,
  onVoiceDisconnect,
  onSendMessage,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onStartStream,
  onStopStream,
  onOpenStreamQuality,
  liveKitParticipants,
  screenVideoRef,
}: DashboardProps) {
  const currentChannel = channels.find((ch) => ch.id === currentChannelId);
  const channelMessages = messages.filter((m) => m.channelId === currentChannelId);

  // Se o canal selecionado for de voz ou se houver transmissão ativa, exibe o palco da chamada
  const isVoiceChannel = currentChannel?.type === 'voice';
  const showStage = isVoiceChannel || streamState.isActive || (activeStreams && activeStreams.length > 0);

  return (
    <div className="dashboard">
      {/* Esquerda: Canais + Barra de Usuário */}
      <div className="dashboard__sidebar">
        <ChannelSidebar
          channels={channels}
          members={members}
          currentChannelId={currentChannelId}
          voiceState={voiceState}
          nickname={nickname}
          onChannelSelect={onChannelSelect}
          onVoiceConnect={onVoiceConnect}
          onVoiceDisconnect={onVoiceDisconnect}
        />
        <UserBar
          nickname={nickname}
          isMuted={isMuted}
          isDeafened={isDeafened}
          isVoiceConnected={voiceState.isConnected}
          isStreaming={streamState.isActive}
          onToggleMute={onToggleMute}
          onToggleDeafen={onToggleDeafen}
          onOpenSettings={onOpenSettings}
          onStartStream={onStartStream}
          onStopStream={onStopStream}
        />
      </div>

      {/* Centro: Chat ou Palco de Voz/Transmissão */}
      <div className="dashboard__center">
        {showStage ? (
          <StageView
            channelName={currentChannel?.name || 'Canal de Voz'}
            voiceState={voiceState}
            streamState={streamState}
            activeScreenTrack={activeScreenTrack}
            activeStreams={activeStreams}
            onStopStream={onStopStream}
            onStartStream={onStartStream}
            onOpenStreamQuality={onOpenStreamQuality}
            onToggleMute={onToggleMute}
            onToggleDeafen={onToggleDeafen}
            onVoiceDisconnect={onVoiceDisconnect}
            liveKitParticipants={liveKitParticipants}
            screenVideoRef={screenVideoRef}
            nickname={nickname}
            isMuted={isMuted}
            isDeafened={isDeafened}
          />
        ) : currentChannel ? (
          <ChatPanel
            channel={currentChannel}
            messages={channelMessages}
            onSendMessage={onSendMessage}
          />
        ) : null}
      </div>

      {/* Direita: Lista de Membros Reais */}
      <div className="dashboard__members">
        <MembersList members={members} />
      </div>
    </div>
  );
}
