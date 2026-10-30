import { useState, type RefObject } from 'react';
import type { Channel, Member, Message, VoiceState, StreamState, ActiveStream } from '../types';
import type { LiveKitParticipant } from '../hooks/useLiveKit';
import ChannelSidebar from './ChannelSidebar';
import ChatPanel from './ChatPanel';
import StageView from './StageView';
import MembersList from './MembersList';
import UserBar from './UserBar';
import ShelterMark from './ShelterMark';
import './Dashboard.css';

interface DashboardProps {
  nickname: string;
  channels: Channel[];
  members: Member[];
  messages: Message[];
  currentChannelId: string;
  voiceState: VoiceState;
  streamState: StreamState;
  isLocalStreaming?: boolean;
  isCameraEnabled?: boolean;
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
  onToggleCamera?: () => void;
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
  isLocalStreaming = false,
  isCameraEnabled = false,
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
  onToggleCamera,
  onOpenSettings,
  onStartStream,
  onStopStream,
  onOpenStreamQuality,
  liveKitParticipants,
  screenVideoRef,
}: DashboardProps) {
  const [showMembers, setShowMembers] = useState(true);

  const currentChannel = channels.find((ch) => ch.id === currentChannelId);
  const channelMessages = messages.filter((m) => m.channelId === currentChannelId);

  // Se o canal selecionado for de texto, exibe o ChatPanel.
  // Se for de voz (ou se nenhuma aba de texto estiver aberta e houver transmissão), exibe o palco da chamada.
  const isTextChannel = currentChannel?.type === 'text';
  const isVoiceChannel = currentChannel?.type === 'voice';
  const showStage = !isTextChannel && (isVoiceChannel || streamState.isActive || (activeStreams && activeStreams.length > 0));

  const connectedVoiceChannel = voiceState.isConnected
    ? channels.find((ch) => ch.id === voiceState.channelId)
    : null;

  return (
    <div className="dashboard-wrapper">
      {/* ============================================
          TOP TACTICAL COMMAND BRIDGE (HEADER GERAL)
          ============================================ */}
      <header className="tactical-bridge">
        {/* Bridge Left: Brand & Secure Protocol */}
        <div className="tactical-bridge__brand">
          <ShelterMark size={22} className="tactical-bridge__logo" />
          <span className="tactical-bridge__title">SHELTER</span>
          <span className="tactical-bridge__badge">TERMINAL TÁTICO</span>
          <div className="tactical-bridge__sec-pulse">
            <span className="tactical-bridge__sec-dot" />
            <span className="tactical-bridge__sec-text">AES-GCM // SEGURO</span>
          </div>
        </div>

        {/* Bridge Center: Active Node HUD & Telemetry */}
        <div className="tactical-bridge__hud">
          <div className="tactical-bridge__frequency-display">
            <span className="tactical-bridge__freq-icon">
              {showStage ? '∿' : '>_'}
            </span>
            <span className="tactical-bridge__freq-name">
              {showStage
                ? `FREQUÊNCIA :: ${currentChannel?.name.toUpperCase() || 'SALA TÁTICA'}`
                : `TERMINAL :: ${currentChannel?.name.toUpperCase() || 'DADOS'}`}
            </span>
          </div>

          <div className="tactical-bridge__telemetry">
            <span className="tactical-bridge__stat">SFU: LIVEKIT 7880</span>
            <span className="tactical-bridge__stat-divider">/</span>
            <span className="tactical-bridge__stat">LATÊNCIA: ESTÁVEL</span>
            <span className="tactical-bridge__stat-divider">/</span>
            <span className="tactical-bridge__stat">OPERADORES: {members.length}</span>
          </div>
        </div>

        {/* Bridge Right: Quick Deck Toggles */}
        <div className="tactical-bridge__actions">
          {/* Quick Mic Indicator & Toggle */}
          <button
            className={`bridge-btn ${isMuted ? 'bridge-btn--muted' : 'bridge-btn--active'}`}
            onClick={onToggleMute}
            title={isMuted ? 'Microfone Mutado (Clique para ativar)' : 'Microfone Ativo'}
          >
            <span className="bridge-btn__dot" />
            MIC {isMuted ? 'OFF' : 'ON'}
          </button>

          {/* Quick Deafen Indicator & Toggle */}
          <button
            className={`bridge-btn ${isDeafened ? 'bridge-btn--muted' : ''}`}
            onClick={onToggleDeafen}
            title={isDeafened ? 'Áudio Desativado (Clique para ouvir)' : 'Áudio Ativo'}
          >
            SOM {isDeafened ? 'OFF' : 'ON'}
          </button>

          {/* Toggle Operator Roster Panel */}
          <button
            className={`bridge-btn bridge-btn--toggle ${showMembers ? 'bridge-btn--active' : ''}`}
            onClick={() => setShowMembers((prev) => !prev)}
            title="Alternar visibilidade da lista de operadores"
          >
            OPERADORES [{members.length}]
          </button>

          {/* System Settings */}
          <button
            className="bridge-btn bridge-btn--settings"
            onClick={onOpenSettings}
            title="Abrir configurações do sistema"
          >
            CONFIG
          </button>
        </div>
      </header>

      {/* ============================================
          MAIN WORKSPACE LAYOUT
          ============================================ */}
      <div className={`dashboard-body ${showMembers ? 'dashboard-body--with-members' : 'dashboard-body--no-members'}`}>
        {/* Esquerda: Barra de Usuário no Topo + Diretório de Canais */}
        <aside className="dashboard__sidebar">
          {/* Operator Deck posicionado no TOPO da coluna lateral */}
          <UserBar
            nickname={nickname}
            isMuted={isMuted}
            isDeafened={isDeafened}
            isVoiceConnected={voiceState.isConnected}
            isStreaming={isLocalStreaming}
            isCameraEnabled={isCameraEnabled}
            onToggleMute={onToggleMute}
            onToggleDeafen={onToggleDeafen}
            onToggleCamera={onToggleCamera}
            onOpenSettings={onOpenSettings}
            onStartStream={onStartStream}
            onStopStream={onStopStream}
          />

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
        </aside>

        {/* Centro: Chat ou Palco de Voz/Transmissão */}
        <main className="dashboard__center">
          {showStage ? (
            <StageView
              channelName={currentChannel?.name || 'Canal de Voz'}
              voiceState={voiceState}
              streamState={streamState}
              isLocalStreaming={isLocalStreaming}
              isCameraEnabled={isCameraEnabled}
              activeScreenTrack={activeScreenTrack}
              activeStreams={activeStreams}
              onStopStream={onStopStream}
              onStartStream={onStartStream}
              onOpenStreamQuality={onOpenStreamQuality}
              onToggleMute={onToggleMute}
              onToggleDeafen={onToggleDeafen}
              onToggleCamera={onToggleCamera}
              onVoiceDisconnect={onVoiceDisconnect}
              liveKitParticipants={liveKitParticipants}
              screenVideoRef={screenVideoRef}
              nickname={nickname}
              isMuted={isMuted}
              isDeafened={isDeafened}
              messages={messages}
              channels={channels}
              onSendMessage={onSendMessage}
            />
          ) : currentChannel ? (
            <div className="dashboard__chat-container">
              {connectedVoiceChannel && (
                <div className="tactical-call-hud">
                  <div className="tactical-call-hud__info">
                    <span className="tactical-call-hud__pulse" />
                    <span className="tactical-call-hud__label">EM CHAMADA DE VOZ:</span>
                    <span className="tactical-call-hud__room">{connectedVoiceChannel.name.toUpperCase()}</span>
                    {isLocalStreaming && (
                      <span className="tactical-call-hud__stream-badge">TRANSMITINDO TELA</span>
                    )}
                  </div>
                  <div className="tactical-call-hud__actions">
                    <button
                      type="button"
                      className="tactical-call-hud__btn tactical-call-hud__btn--return"
                      onClick={() => onChannelSelect(connectedVoiceChannel.id)}
                      title="Retornar à tela de vídeo e voz"
                    >
                      RETORNAR AO PALCO
                    </button>
                    <button
                      type="button"
                      className="tactical-call-hud__btn tactical-call-hud__btn--disconnect"
                      onClick={onVoiceDisconnect}
                      title="Desconectar da chamada de voz"
                    >
                      CORTAR SINAL
                    </button>
                  </div>
                </div>
              )}
              <ChatPanel
                channel={currentChannel}
                messages={channelMessages}
                onSendMessage={onSendMessage}
              />
            </div>
          ) : null}
        </main>

        {/* Direita: Lista de Membros Reais (Alternável pelo Topbar) */}
        {showMembers && (
          <aside className="dashboard__members">
            <MembersList members={members} />
          </aside>
        )}
      </div>
    </div>
  );
}
