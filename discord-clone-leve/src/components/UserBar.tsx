import { getInitials } from '../data/mockData';
import './UserBar.css';

interface UserBarProps {
  nickname: string;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenSettings: () => void;
}

export default function UserBar({
  nickname,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
}: UserBarProps) {
  return (
    <div className="user-bar">
      {/* User Info */}
      <div className="user-bar__info">
        <div className="user-bar__avatar">
          {getInitials(nickname)}
          <div className="user-bar__avatar-status" />
        </div>
        <div className="user-bar__text">
          <div className="user-bar__name">{nickname}</div>
          <div className="user-bar__tag">Online</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="user-bar__actions">
        {/* Mute Button */}
        <button
          className={`user-bar__btn ${isMuted ? 'user-bar__btn--active' : ''}`}
          onClick={onToggleMute}
          data-tooltip={isMuted ? 'Ativar Microfone' : 'Mutar'}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            {isMuted && (
              <line className="strikethrough" x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
            )}
          </svg>
        </button>

        {/* Deafen Button */}
        <button
          className={`user-bar__btn ${isDeafened ? 'user-bar__btn--active' : ''}`}
          onClick={onToggleDeafen}
          data-tooltip={isDeafened ? 'Ativar Som' : 'Desativar Som'}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h2v-8H4v-2c0-4.42 3.58-8 8-8s8 3.58 8 8v2h-4v8h2c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
            {isDeafened && (
              <line className="strikethrough" x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
            )}
          </svg>
        </button>

        {/* Settings Button */}
        <button
          className="user-bar__btn"
          onClick={onOpenSettings}
          data-tooltip="Configurações"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
