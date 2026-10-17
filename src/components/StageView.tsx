import { useState, useRef, useEffect, type RefObject } from 'react';
import type { StreamState, VoiceState, ActiveStream } from '../types';
import type { LiveKitParticipant } from '../hooks/useLiveKit';
import { getInitials } from '../data/mockData';
import './StageView.css';

interface StageViewProps {
  channelName?: string;
  voiceState: VoiceState;
  streamState: StreamState;
  activeScreenTrack?: MediaStreamTrack | null;
  activeStreams?: ActiveStream[];
  liveKitParticipants?: LiveKitParticipant[];
  screenVideoRef?: RefObject<HTMLVideoElement | null>;
  nickname: string;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onStartStream: () => void;
  onStopStream: () => void;
  onVoiceDisconnect: () => void;
  onOpenStreamQuality?: () => void;
}

function StreamTile({
  stream,
  isFocused,
  onToggleFocus,
  onStopStream,
  isSingle,
}: {
  stream: ActiveStream;
  isFocused: boolean;
  onToggleFocus: () => void;
  onStopStream?: () => void;
  isSingle: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream.track) {
      videoRef.current.srcObject = new MediaStream([stream.track]);
      videoRef.current.play().catch(() => {});
    }
  }, [stream.track]);

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div
      className={`stream-tile ${isFocused ? 'stream-tile--focused' : ''} ${isSingle ? 'stream-tile--single' : ''}`}
      onClick={!isSingle ? onToggleFocus : undefined}
      title={!isSingle ? (isFocused ? 'Clique para ver em tela dividida' : 'Clique para expandir') : undefined}
    >
      <div className="stream-tile__overlay-header">
        <div className="stream-tile__info">
          <span className="stream-tile__live-badge">Ao Vivo</span>
          <span className="stream-tile__quality-badge">{stream.qualityLabel || '1080p • 60 FPS'}</span>
          <span className="stream-tile__name">{stream.participantName}</span>
        </div>
        <div className="stream-tile__actions">
          {!isSingle && (
            <button
              className="stream-tile__btn"
              onClick={(e) => { e.stopPropagation(); onToggleFocus(); }}
              title={isFocused ? 'Ver em tela dividida' : 'Focar'}
            >
              {isFocused ? '🗗 Dividir' : '🗖 Expandir'}
            </button>
          )}
          <button
            className="stream-tile__btn"
            onClick={handleFullscreen}
            title="Tela Cheia"
          >
            ⛶
          </button>
          {stream.isLocal && onStopStream && (
            <button
              className="stream-tile__btn stream-tile__btn--stop"
              onClick={(e) => { e.stopPropagation(); onStopStream(); }}
              title="Parar Transmissão"
            >
              Parar
            </button>
          )}
        </div>
      </div>
      <video
        ref={videoRef}
        className="stream-tile__video"
        autoPlay
        playsInline
        muted={stream.isLocal}
      />
    </div>
  );
}

export default function StageView({
  channelName = 'Canal de Voz',
  voiceState,
  streamState,
  activeScreenTrack,
  activeStreams = [],
  liveKitParticipants = [],
  nickname,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onStartStream,
  onStopStream,
  onVoiceDisconnect,
  onOpenStreamQuality,
}: StageViewProps) {
  const [focusedStreamId, setFocusedStreamId] = useState<string | null>(null);

  // Fallback para caso activeStreams esteja vazio mas activeScreenTrack exista
  const effectiveStreams: ActiveStream[] =
    activeStreams.length > 0
      ? activeStreams
      : activeScreenTrack
      ? [
          {
            participantId: streamState.streamerId || 'streamer',
            participantName:
              streamState.streamerId === nickname || streamState.streamerId === 'self'
                ? `${nickname} (Você)`
                : streamState.streamerId || 'Transmissão',
            track: activeScreenTrack,
            isLocal: streamState.streamerId === nickname || streamState.streamerId === 'self',
            qualityLabel: '1080p • 60 FPS',
          },
        ]
      : [];

  const hasStreams = effectiveStreams.length > 0;

  // Lista de participantes reais na chamada
  const displayParticipants =
    liveKitParticipants.length > 0
      ? liveKitParticipants.map((p) => {
          const isSelf = p.identity === nickname || p.identity === 'self';
          return {
            id: p.identity,
            name: isSelf ? `${nickname} (Você)` : p.name || p.identity,
            isMuted: isSelf ? isMuted : p.isMuted,
            isSpeaking: p.isSpeaking,
            isSelf,
          };
        })
      : [
          {
            id: 'self',
            name: `${nickname || 'Você'} (Você)`,
            isMuted: isMuted,
            isSpeaking: false,
            isSelf: true,
          },
        ];

  const getAvatarColor = (name: string): string => {
    const colors = ['#5865f2', '#3ba55d', '#faa81a', '#ed4245', '#eb459e', '#9b59b6', '#e67e22', '#1abc9c'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleToggleFocus = (id: string) => {
    setFocusedStreamId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="stage-view">
      {/* Header do Palco de Voz */}
      <div className="stage-view__header">
        <div className="stage-view__header-info">
          {hasStreams ? (
            <>
              <span className="stage-view__live-badge">Ao Vivo</span>
              <span className="stage-view__quality-pill">1080p • 60 FPS</span>
              <span className="stage-view__stream-title">
                {effectiveStreams.length === 1
                  ? `${effectiveStreams[0].participantName} transmitindo`
                  : `${effectiveStreams.length} Transmissões simultâneas (Tela Dividida)`}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.2rem', marginRight: '4px' }}>🔊</span>
              <span className="stage-view__stream-title">{channelName}</span>
              <span style={{ color: 'var(--text-muted, #949ba4)', fontSize: '0.85rem', marginLeft: '8px' }}>
                ({displayParticipants.length} participante{displayParticipants.length === 1 ? '' : 's'})
              </span>
            </>
          )}
        </div>

        <div className="stage-view__header-actions">
          {onOpenStreamQuality && (
            <button
              className="stage-view__btn stage-view__btn--secondary"
              onClick={onOpenStreamQuality}
              title="Configurar Resolução e FPS"
            >
              ⚙️ Qualidade (1080p 60fps)
            </button>
          )}
          {hasStreams && effectiveStreams.some((s) => s.isLocal) && (
            <button className="stage-view__btn stage-view__btn--stop" onClick={onStopStream} title="Parar Minha Transmissão">
              Parar Transmissão
            </button>
          )}
        </div>
      </div>

      {/* CASO 1: Transmissões ativas (1 ou mais telas simultâneas) */}
      {hasStreams ? (
        <div className="stage-view__stream-layout">
          {/* Mini-carrossel de participantes no topo */}
          <div className="stage-view__cameras">
            {displayParticipants.map((p) => (
              <div
                key={p.id}
                className={`stage-view__camera-card ${p.isSpeaking ? 'stage-view__camera-card--speaking' : ''}`}
              >
                <div className="stage-view__camera-placeholder">
                  <div
                    className="stage-view__camera-avatar"
                    style={{ background: getAvatarColor(p.name) }}
                  >
                    {getInitials(p.name)}
                  </div>
                  <span className="stage-view__camera-name">{p.name}</span>
                  {p.isMuted && <span style={{ fontSize: '0.7rem' }}>🔇</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Grid de Transmissões (Suporte a Múltiplas Telas Simultâneas) */}
          <div
            className={`stage-view__streams-grid stage-view__streams-grid--${
              effectiveStreams.length === 1 ? 'single' : focusedStreamId ? 'focused' : 'split'
            }`}
          >
            {effectiveStreams.map((stream) => {
              const isFocused = focusedStreamId === stream.participantId;
              // Se há um stream focado e este não é ele, esconde ou renderiza miniatura
              if (focusedStreamId && !isFocused) return null;

              return (
                <StreamTile
                  key={stream.participantId}
                  stream={stream}
                  isFocused={isFocused}
                  isSingle={effectiveStreams.length === 1}
                  onToggleFocus={() => handleToggleFocus(stream.participantId)}
                  onStopStream={stream.isLocal ? onStopStream : undefined}
                />
              );
            })}
          </div>

          {/* Se um stream estiver focado, barra inferior para restaurar tela dividida */}
          {focusedStreamId && effectiveStreams.length > 1 && (
            <div className="stage-view__unfocus-bar">
              <span>Você está com zoom em uma das telas.</span>
              <button
                className="stage-view__btn stage-view__btn--secondary"
                onClick={() => setFocusedStreamId(null)}
              >
                Restaurar Tela Dividida (Ver Ambas)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CASO 2: Sala de Voz Normal (Sem transmissão de tela) */
        <div className="voice-grid">
          {/* Grid com cartões dos participantes */}
          <div className="voice-grid__participants">
            {displayParticipants.map((p) => (
              <div
                key={p.id}
                className={`voice-card ${p.isSpeaking ? 'voice-card--speaking' : ''}`}
              >
                <div
                  className="voice-card__avatar"
                  style={{ background: getAvatarColor(p.name) }}
                >
                  {getInitials(p.name)}
                </div>
                <div className="voice-card__name" title={p.name}>
                  {p.name}
                </div>

                {p.isMuted && (
                  <div className="voice-card__status" title="Microfone Desativado">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ed4245">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <line x1="3" y1="3" x2="21" y2="21" stroke="#ed4245" strokeWidth="2.5" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mensagem se for o primeiro usuário na chamada */}
          {displayParticipants.length === 1 && (
            <div className="voice-grid__empty-hint">
              🎉 <strong>Você conectou na chamada com sucesso!</strong>
              <br />
              Aguardando amigos entrarem na <em>{channelName}</em>... Qualquer pessoa que conectar no servidor poderá entrar nesta sala.
            </div>
          )}

          {/* Barra de Controles Rápidos da Chamada */}
          <div className="voice-grid__controls">
            {/* Microfone */}
            <button
              className={`voice-grid__ctrl-btn ${isMuted ? 'voice-grid__ctrl-btn--active' : ''}`}
              onClick={onToggleMute}
              title={isMuted ? 'Ativar Microfone' : 'Desativar Microfone'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                {isMuted && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />}
              </svg>
            </button>

            {/* Fone / Áudio */}
            <button
              className={`voice-grid__ctrl-btn ${isDeafened ? 'voice-grid__ctrl-btn--active' : ''}`}
              onClick={onToggleDeafen}
              title={isDeafened ? 'Ativar Som' : 'Desativar Som'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h2v-8H4v-2c0-4.42 3.58-8 8-8s8 3.58 8 8v2h-4v8h2c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
                {isDeafened && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />}
              </svg>
            </button>

            {/* Compartilhar Tela (1080p 60fps) */}
            <button
              className="voice-grid__ctrl-btn"
              onClick={onStartStream}
              title="Compartilhar Tela (1080p 60 FPS)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
              </svg>
            </button>

            {/* Engrenagem de Qualidade */}
            {onOpenStreamQuality && (
              <button
                className="voice-grid__ctrl-btn"
                onClick={onOpenStreamQuality}
                title="Configurar Resolução e FPS da Transmissão"
              >
                ⚙️
              </button>
            )}

            {/* Desconectar Chamada */}
            {voiceState.isConnected && (
              <button
                className="voice-grid__ctrl-btn voice-grid__ctrl-btn--disconnect"
                onClick={onVoiceDisconnect}
                title="Desconectar da Chamada"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" transform="rotate(45 12 12)" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
