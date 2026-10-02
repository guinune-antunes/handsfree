import type { RefObject } from 'react';
import type { Member, StreamState } from '../types';
import type { LiveKitParticipant } from '../hooks/useLiveKit';
import { getInitials, getMemberById } from '../data/mockData';
import './StageView.css';

interface StageViewProps {
  members: Member[];
  streamState: StreamState;
  onStopStream: () => void;
  liveKitParticipants?: LiveKitParticipant[];
  screenVideoRef?: RefObject<HTMLVideoElement | null>;
}

export default function StageView({
  members,
  streamState,
  onStopStream,
  liveKitParticipants = [],
  screenVideoRef,
}: StageViewProps) {
  const streamer = streamState.streamerId ? getMemberById(streamState.streamerId) : null;
  const streamerName = streamer?.name
    || liveKitParticipants.find((p) => p.identity === streamState.streamerId)?.name
    || streamState.streamerId;

  // Use LiveKit participants if available, fallback to mock
  const camerasActive = liveKitParticipants.length > 0
    ? liveKitParticipants
    : members.filter((m) => m.status === 'online' && !m.isDeafened).slice(0, 5);

  const getAvatarColor = (name: string): string => {
    const colors = ['#5865f2', '#3ba55d', '#faa81a', '#ed4245', '#eb459e', '#9b59b6', '#e67e22', '#1abc9c'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="stage-view">
      {/* Header */}
      <div className="stage-view__header">
        <div className="stage-view__header-info">
          <span className="stage-view__live-badge">Ao Vivo</span>
          <span className="stage-view__stream-title">
            {streamerName ? `${streamerName} está transmitindo` : 'Transmissão ativa'}
          </span>
        </div>
        <div className="stage-view__header-actions">
          <button className="stage-view__btn stage-view__btn--secondary">
            <svg className="stage-view__btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
            Tela Cheia
          </button>
          <button className="stage-view__btn stage-view__btn--stop" onClick={onStopStream}>
            <svg className="stage-view__btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
              <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" />
            </svg>
            Parar
          </button>
        </div>
      </div>

      {/* Camera Carousel — shows LiveKit participants */}
      <div className="stage-view__cameras">
        {camerasActive.map((participant) => {
          const name = 'name' in participant ? participant.name : (participant as Member).name;
          const id = 'identity' in participant ? participant.identity : (participant as Member).id;
          const isSpeaking = 'isSpeaking' in participant ? participant.isSpeaking : false;

          return (
            <div
              key={id}
              className={`stage-view__camera-card ${isSpeaking ? 'stage-view__camera-card--speaking' : ''}`}
            >
              <div className="stage-view__camera-placeholder">
                <div
                  className="stage-view__camera-avatar"
                  style={{ background: getAvatarColor(name) }}
                >
                  {getInitials(name)}
                </div>
                <span className="stage-view__camera-name">{name}</span>
                {isSpeaking && <span className="stage-view__speaking-indicator">🔊</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Stream Area — real video from LiveKit */}
      <div className="stage-view__main">
        {/* Real screen share video element */}
        <video
          ref={screenVideoRef}
          className="stage-view__video"
          autoPlay
          playsInline
          muted
          style={{
            display: streamState.isActive ? 'block' : 'none',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#000',
            borderRadius: '8px',
          }}
        />

        {/* Placeholder when no stream */}
        {!streamState.isActive && (
          <div className="stage-view__stream-placeholder">
            <div className="stage-view__stream-placeholder-icon">🖥️</div>
            <div className="stage-view__stream-placeholder-text">
              {streamerName ? `Transmissão de ${streamerName}` : 'Aguardando transmissão...'}
            </div>
            <div className="stage-view__stream-placeholder-hint">
              A transmissão de tela aparecerá aqui quando conectada ao servidor LiveKit
            </div>
          </div>
        )}

        {/* Overlay Controls (appear on hover) */}
        <div className="stage-view__overlay">
          <button className="stage-view__overlay-btn" data-tooltip="Volume">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          </button>
          <button className="stage-view__overlay-btn" data-tooltip="Tela Cheia">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
