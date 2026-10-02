import type { RefObject } from 'react';
import type { Channel, Member, Message, VoiceState, StreamState } from '../types';
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
  isMuted,
  isDeafened,
  onChannelSelect,
  onVoiceConnect,
  onVoiceDisconnect,
  onSendMessage,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onStartStream: _onStartStream,
  onStopStream,
  liveKitParticipants,
  screenVideoRef,
}: DashboardProps) {
  const currentChannel = channels.find((ch) => ch.id === currentChannelId);
  const channelMessages = messages.filter((m) => m.channelId === currentChannelId);

  return (
    <div className="dashboard">
      {/* Left: Channels + User Bar */}
      <div className="dashboard__sidebar">
        <ChannelSidebar
          channels={channels}
          members={members}
          currentChannelId={currentChannelId}
          voiceState={voiceState}
          onChannelSelect={onChannelSelect}
          onVoiceConnect={onVoiceConnect}
          onVoiceDisconnect={onVoiceDisconnect}
        />
        <UserBar
          nickname={nickname}
          isMuted={isMuted}
          isDeafened={isDeafened}
          onToggleMute={onToggleMute}
          onToggleDeafen={onToggleDeafen}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Center: Chat or Stage */}
      <div className="dashboard__center">
        {streamState.isActive ? (
          <StageView
            members={members}
            streamState={streamState}
            onStopStream={onStopStream}
            liveKitParticipants={liveKitParticipants}
            screenVideoRef={screenVideoRef}
          />
        ) : currentChannel ? (
          <ChatPanel
            channel={currentChannel}
            messages={channelMessages}
            onSendMessage={onSendMessage}
          />
        ) : null}
      </div>

      {/* Right: Members */}
      <div className="dashboard__members">
        <MembersList members={members} />
      </div>
    </div>
  );
}
