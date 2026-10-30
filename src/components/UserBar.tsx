import { getInitials } from '../data/mockData';
import './UserBar.css';

interface UserBarProps {
  nickname: string;
  isMuted: boolean;
  isDeafened: boolean;
  isVoiceConnected?: boolean;
  isStreaming?: boolean;
  isCameraEnabled?: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleCamera?: () => void;
  onOpenSettings: () => void;
  onStartStream?: () => void;
  onStopStream?: () => void;
}

export default function UserBar({
  nickname,
  isMuted,
  isDeafened,
  isVoiceConnected = false,
  isStreaming = false,
  isCameraEnabled = false,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onOpenSettings,
  onStartStream,
  onStopStream,
}: UserBarProps) {
  return (
    <div className="operator-deck">
      {/* Operator Identity Card */}
      <div className="operator-deck__profile">
        <div className="operator-deck__avatar-wrapper">
          <div className="operator-deck__avatar chamfer-sm">
            {getInitials(nickname)}
          </div>
          <div className="operator-deck__status-indicator" title="Status: Operacional" />
        </div>

        <div className="operator-deck__meta">
          <div className="operator-deck__callsign-row">
            <span className="operator-deck__badge">OP</span>
            <span className="operator-deck__callsign" title={nickname}>{nickname}</span>
          </div>
          <div className="operator-deck__telemetry">
            <span className="operator-deck__status-text">
              {isVoiceConnected ? 'TX/RX ATIVO' : 'EM ESPERA'}
            </span>
            {isVoiceConnected && (
              <div className="vu-meter" title="Sinal de Áudio Ativo">
                <span className="vu-meter__bar" />
                <span className="vu-meter__bar" />
                <span className="vu-meter__bar" />
                <span className="vu-meter__bar" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hardware / Tactical Controls */}
      <div className="operator-deck__controls">
        {/* Mute Button */}
        <button
          className={`operator-btn ${isMuted ? 'operator-btn--muted' : ''}`}
          onClick={onToggleMute}
          data-tooltip={isMuted ? 'Transmitir Áudio (Desmutar)' : 'Mutar Microfone'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
            {isMuted && <line x1="2" y1="2" x2="22" y2="22" stroke="var(--red)" strokeWidth="2.5" />}
          </svg>
        </button>

        {/* Deafen Button */}
        <button
          className={`operator-btn ${isDeafened ? 'operator-btn--muted' : ''}`}
          onClick={onToggleDeafen}
          data-tooltip={isDeafened ? 'Reativar Áudio da Sala' : 'Silenciar Tudo'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
            {isDeafened && <line x1="2" y1="2" x2="22" y2="22" stroke="var(--red)" strokeWidth="2.5" />}
          </svg>
        </button>

        {/* Camera Button (when connected to voice) */}
        {isVoiceConnected && (
          <button
            className={`operator-btn ${isCameraEnabled ? 'operator-btn--active' : ''}`}
            onClick={onToggleCamera}
            data-tooltip={isCameraEnabled ? 'Desligar Câmera' : 'Ligar Câmera'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
        )}

        {/* Screenshare Broadcast Button (when connected to voice) */}
        {isVoiceConnected && (
          <button
            className={`operator-btn ${isStreaming ? 'operator-btn--active' : ''}`}
            onClick={isStreaming ? onStopStream : onStartStream}
            data-tooltip={isStreaming ? 'Encerrar Transmissão' : 'Transmitir Tela'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <circle cx="12" cy="10" r="2" fill="currentColor" opacity="0.6" />
            </svg>
          </button>
        )}

        {/* Settings Button */}
        <button
          className="operator-btn"
          onClick={onOpenSettings}
          data-tooltip="Terminal de Configuração"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
