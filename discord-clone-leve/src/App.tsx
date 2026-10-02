import { useState, useCallback } from 'react';
import type { AppConfig, Screen, Channel, Member, Message } from './types';
import { MOCK_MEMBERS, MOCK_CHANNELS, MOCK_MESSAGES } from './data/mockData';
import { getLiveKitUrl, fetchLiveKitToken } from './config/livekit';
import { useLiveKit } from './hooks/useLiveKit';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import './App.css';

function App() {
  // --- Screen routing ---
  const [screen, setScreen] = useState<Screen>('login');
  const [config, setConfig] = useState<AppConfig>({ host: '', port: 7880, nickname: '' });

  // --- App state ---
  const [currentChannelId, setCurrentChannelId] = useState('ch-text-1');
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS);
  const [members] = useState<Member[]>(MOCK_MEMBERS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

  // --- LiveKit real voice/video ---
  const liveKit = useLiveKit();

  // --- Settings modal ---
  const [settingsOpen, setSettingsOpen] = useState(false);

  // --- Token server URL (runs on port 3001 of the same host) ---
  const getTokenUrl = useCallback(() => {
    return `http://${config.host}:3001`;
  }, [config.host]);

  // --- Handlers ---
  const handleConnect = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    setScreen('dashboard');
  }, []);

  const handleChannelSelect = useCallback((channelId: string) => {
    setCurrentChannelId(channelId);
  }, []);

  const handleVoiceConnect = useCallback(async (channelId: string) => {
    try {
      // Fetch a token from the token server
      const tokenUrl = getTokenUrl();
      const roomName = `voice-${channelId}`;
      console.log(`[App] Fetching token from ${tokenUrl} for room ${roomName}...`);

      let token: string;
      try {
        token = await fetchLiveKitToken(tokenUrl, roomName, config.nickname);
        console.log('[App] Token received successfully');
      } catch (tokenErr) {
        const msg = `Não foi possível obter token do servidor. Verifique se o token-server está rodando em ${tokenUrl}`;
        console.error('[App] Token fetch failed:', tokenErr);
        alert(msg);
        return;
      }

      // Connect to LiveKit room
      const livekitUrl = getLiveKitUrl(config.host, config.port);
      console.log(`[App] Connecting to LiveKit at ${livekitUrl}...`);

      try {
        await liveKit.connectToRoom(livekitUrl, token, channelId);
        console.log('[App] Connected to LiveKit!');
      } catch (lkErr) {
        const msg = `Não foi possível conectar ao LiveKit em ${livekitUrl}. Verifique se o servidor está rodando.`;
        console.error('[App] LiveKit connection failed:', lkErr);
        alert(msg);
        return;
      }

      // Update channel UI to show self as connected
      setChannels((prev) =>
        prev.map((ch) => {
          if (ch.id === channelId && ch.type === 'voice') {
            const alreadyConnected = ch.connectedMembers.includes('self');
            return alreadyConnected
              ? ch
              : { ...ch, connectedMembers: [...ch.connectedMembers, 'self'] };
          }
          // Remove from other voice channels
          if (ch.type === 'voice' && ch.id !== channelId) {
            return {
              ...ch,
              connectedMembers: ch.connectedMembers.filter((id) => id !== 'self'),
            };
          }
          return ch;
        })
      );
    } catch (error) {
      console.error('[App] Unexpected error in voice connect:', error);
      alert('Erro inesperado ao conectar ao canal de voz. Verifique o console.');
    }
  }, [config, getTokenUrl, liveKit]);

  const handleVoiceDisconnect = useCallback(() => {
    liveKit.disconnect();
    setChannels((prev) =>
      prev.map((ch) =>
        ch.type === 'voice'
          ? { ...ch, connectedMembers: ch.connectedMembers.filter((id) => id !== 'self') }
          : ch
      )
    );
  }, [liveKit]);

  const handleSendMessage = useCallback(
    (content: string) => {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        authorId: 'self',
        authorName: config.nickname || 'Você',
        authorAvatar: '',
        content,
        timestamp: Date.now(),
        channelId: currentChannelId,
      };
      setMessages((prev) => [...prev, newMsg]);
    },
    [config.nickname, currentChannelId]
  );

  const handleToggleMute = useCallback(() => {
    liveKit.toggleMute();
  }, [liveKit]);

  const handleToggleDeafen = useCallback(() => {
    liveKit.toggleDeafen();
  }, [liveKit]);

  const handleStartStream = useCallback(() => {
    liveKit.startScreenShare();
  }, [liveKit]);

  const handleStopStream = useCallback(() => {
    liveKit.stopScreenShare();
  }, [liveKit]);

  return (
    <>
      {screen === 'login' && <LoginScreen onConnect={handleConnect} />}

      {screen === 'dashboard' && (
        <Dashboard
          nickname={config.nickname}
          channels={channels}
          members={members}
          messages={messages}
          currentChannelId={currentChannelId}
          voiceState={liveKit.voiceState}
          streamState={liveKit.streamState}
          isMuted={liveKit.voiceState.isMuted}
          isDeafened={liveKit.voiceState.isDeafened}
          onChannelSelect={handleChannelSelect}
          onVoiceConnect={handleVoiceConnect}
          onVoiceDisconnect={handleVoiceDisconnect}
          onSendMessage={handleSendMessage}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
          onOpenSettings={() => setSettingsOpen(true)}
          onStartStream={handleStartStream}
          onStopStream={handleStopStream}
          liveKitParticipants={liveKit.participants}
          screenVideoRef={liveKit.screenVideoRef}
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onStartStream={handleStartStream}
      />
    </>
  );
}

export default App;
