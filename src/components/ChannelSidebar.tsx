import type { Channel, Member, VoiceState } from '../types';
import { getMemberById, getInitials } from '../data/mockData';
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
  members: _members,
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
    if (channel.type === 'text') {
      onChannelSelect(channel.id);
    } else {
      onVoiceConnect(channel.id);
    }
  };

  return (
    <div className="channel-sidebar">
      {/* Server Header */}
      <div className="channel-sidebar__header">
        <span className="channel-sidebar__server-name">Servidor do Xandão</span>
        <svg className="channel-sidebar__header-icon" viewBox="0 0 18 18" fill="currentColor">
          <path d="M4.5 7.5L9 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Channel List */}
      <div className="channel-sidebar__list">
        {/* Text Channels */}
        <div className="channel-section">
          <div className="channel-section__header">
            <svg className="channel-section__arrow" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
            <span className="channel-section__title">Canais de Texto</span>
          </div>

          {textChannels.map((channel) => (
            <div
              key={channel.id}
              className={`channel-item ${currentChannelId === channel.id ? 'channel-item--active' : ''}`}
              onClick={() => handleChannelClick(channel)}
            >
              <span className="channel-item__icon">
                <span className="channel-item__hash">#</span>
              </span>
              <span className="channel-item__name">{channel.name}</span>
            </div>
          ))}
        </div>

        {/* Voice Channels */}
        <div className="channel-section">
          <div className="channel-section__header">
            <svg className="channel-section__arrow" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
            <span className="channel-section__title">Canais de Voz</span>
          </div>

          {voiceChannels.map((channel) => (
            <div key={channel.id}>
              <div
                className={`channel-item ${voiceState.channelId === channel.id ? 'channel-item--active' : ''}`}
                onClick={() => handleChannelClick(channel)}
              >
                <span className="channel-item__icon">🔊</span>
                <span className="channel-item__name">{channel.name}</span>
              </div>

              {/* Users connected to this voice channel */}
              {channel.connectedMembers.length > 0 && (
                <div className="voice-users">
                  {channel.connectedMembers.map((memberId) => {
                    const isSelf = memberId === 'self';
                    const mockMember = getMemberById(memberId);
                    if (!isSelf && !mockMember) return null;

                    const memberName = isSelf ? (nickname || 'Você') : mockMember!.name;
                    const isMuted = isSelf ? voiceState.isMuted : mockMember!.isMuted;

                    return (
                      <div key={memberId} className="voice-user">
                        <div className="voice-user__avatar">
                          {getInitials(memberName)}
                        </div>
                        <span className="voice-user__name">
                          {memberName}
                          {isSelf && <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: '4px' }}>(Você)</span>}
                        </span>
                        {isMuted && (
                          <svg className="voice-user__mute-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Voice Connected Banner */}
      {connectedVoiceChannel && (
        <div className="voice-connected">
          <div className="voice-connected__header">
            <div className="voice-connected__pulse" />
            <span className="voice-connected__status">Conectado a Voz</span>
          </div>
          <div className="voice-connected__channel">
            🔊 {connectedVoiceChannel.name}
          </div>
          <div className="voice-connected__actions">
            <button className="voice-connected__btn voice-connected__btn--disconnect" onClick={onVoiceDisconnect}>
              Desconectar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
