import type { Channel, Member, VoiceState } from '../types';
import { getInitials } from '../data/mockData';
import { APP_VERSION_BASE, APP_CHANNEL } from '../config/version';
import ShelterMark from './ShelterMark';
import './ChannelSidebar.css';

interface ChannelSidebarProps {
  channels: Channel[];
  members: Member[];
  currentChannelId: string;
  voiceState: VoiceState;
  nickname?: string;
  onChannelSelect: (channelId: string) => void;
  onVoiceConnect: (channelId: string) => void;
  onVoiceDisconnect: () => void;
}

export default function ChannelSidebar({
  channels,
  members,
  currentChannelId,
  voiceState,
  nickname,
  onChannelSelect,
  onVoiceConnect,
  onVoiceDisconnect,
}: ChannelSidebarProps) {
  const textChannels = channels.filter((ch) => ch.type === 'text');
  const voiceChannels = channels.filter((ch) => ch.type === 'voice');

  const connectedVoiceChannel = voiceState.isConnected
    ? channels.find((ch) => ch.id === voiceState.channelId)
    : null;

  const handleChannelClick = (channel: Channel) => {
    onChannelSelect(channel.id);
    if (channel.type === 'voice') {
      if (!voiceState.isConnected || voiceState.channelId !== channel.id) {
        onVoiceConnect(channel.id);
      }
    }
  };

  return (
    <div className="channel-sidebar">
      {/* Vault Node Header */}
      <div className="channel-sidebar__header">
        <ShelterMark size={28} className="channel-sidebar__mark" />
        <div className="channel-sidebar__brand">
          <span className="channel-sidebar__server-name">SHELTER</span>
          <span className="channel-sidebar__subtag">VAULT NODE #01</span>
        </div>
        <span className="version-badge channel-sidebar__version">
          v{APP_VERSION_BASE}
          {APP_CHANNEL && <span className="version-badge__tag">{APP_CHANNEL}</span>}
        </span>
      </div>

      {/* Channel Directory */}
      <div className="channel-sidebar__list">
        {/* Voice Frequencies */}
        <div className="channel-section">
          <div className="channel-section__header">
            <span className="channel-section__prefix">//</span>
            <span className="channel-section__title">FREQUÊNCIAS DE TRANSMISSÃO</span>
            <span className="channel-section__count">[{voiceChannels.length}]</span>
          </div>

          <div className="channel-section__items">
            {voiceChannels.map((channel, idx) => {
              const isCurrent = currentChannelId === channel.id;
              const isConnected = voiceState.channelId === channel.id;
              const freqCode = `FRQ-${String(idx + 1).padStart(2, '0')}`;

              return (
                <div key={channel.id} className="channel-item-wrapper">
                  <div
                    className={`channel-item channel-item--voice ${
                      isCurrent || isConnected ? 'channel-item--active' : ''
                    } ${isConnected ? 'channel-item--connected' : ''}`}
                    onClick={() => handleChannelClick(channel)}
                  >
                    <span className="channel-item__tag">{freqCode}</span>

                    <span className="channel-item__icon channel-item__icon--frequency">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 10v3" />
                        <path d="M6 6v11" />
                        <path d="M10 3v18" />
                        <path d="M14 8v7" />
                        <path d="M18 5v13" />
                        <path d="M22 10v3" />
                      </svg>
                    </span>

                    <span className="channel-item__name">{channel.name}</span>

                    {isConnected && (
                      <span className="channel-item__live-indicator">
                        <span className="channel-item__live-dot" />
                        TX
                      </span>
                    )}
                  </div>

                  {/* Connected Operators in this Frequency */}
                  {channel.connectedMembers.length > 0 && (
                    <div className="voice-users">
                      {channel.connectedMembers.map((memberId) => {
                        const isSelf = memberId === 'self' || memberId === nickname;
                        const foundMember = members.find((m) => m.id === memberId);
                        const memberName = isSelf ? (nickname ? `${nickname} (Você)` : 'Você') : (foundMember?.name || memberId);
                        const isMuted = isSelf ? voiceState.isMuted : (foundMember?.isMuted ?? false);

                        return (
                          <div key={memberId} className="voice-user">
                            <div className="voice-user__avatar chamfer-sm">
                              {getInitials(memberName)}
                            </div>
                            <span className="voice-user__name">
                              {memberName}
                            </span>
                            {isMuted ? (
                              <span className="voice-user__muted-tag">[MUT]</span>
                            ) : (
                              <span className="voice-user__active-dot" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Terminals (Text Channels) */}
        <div className="channel-section">
          <div className="channel-section__header">
            <span className="channel-section__prefix">//</span>
            <span className="channel-section__title">TERMINAIS DE DADOS</span>
            <span className="channel-section__count">[{textChannels.length}]</span>
          </div>

          <div className="channel-section__items">
            {textChannels.map((channel, idx) => {
              const isCurrent = currentChannelId === channel.id;
              const datCode = `DAT-${String(idx + 1).padStart(2, '0')}`;

              return (
                <div
                  key={channel.id}
                  className={`channel-item channel-item--data ${
                    isCurrent ? 'channel-item--active' : ''
                  }`}
                  onClick={() => handleChannelClick(channel)}
                >
                  <span className="channel-item__tag">{datCode}</span>

                  <span className="channel-item__icon channel-item__icon--terminal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                  </span>

                  <span className="channel-item__name">{channel.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tactical Frequency Lock Module (When connected to voice) */}
      {connectedVoiceChannel && (
        <div className="tactical-freq-lock">
          <div className="tactical-freq-lock__header">
            <span className="tactical-freq-lock__pulse" />
            <span className="tactical-freq-lock__title">FREQUÊNCIA BLOQUEADA</span>
            <span className="tactical-freq-lock__codec">OPUS 48kHz</span>
          </div>
          <div className="tactical-freq-lock__info">
            <span className="tactical-freq-lock__name">{connectedVoiceChannel.name}</span>
            <button
              className="tactical-freq-lock__disconnect-btn"
              onClick={onVoiceDisconnect}
              title="Cortar transmissão e desconectar do canal"
            >
              CORTAR SINAL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
