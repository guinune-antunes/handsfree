import { useState, useCallback, useEffect, useMemo } from 'react';
import type { AppConfig, Screen, Channel, Member, Message } from './types';
import { MOCK_CHANNELS } from './data/mockData';
import { getLiveKitUrl, fetchLiveKitToken, getTokenServerUrl } from './config/livekit';
import { useLiveKit } from './hooks/useLiveKit';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import StreamQualityModal from './components/StreamQualityModal';
import './App.css';

function App() {
  // --- Screen routing ---
  const [screen, setScreen] = useState<Screen>('login');
  const [config, setConfig] = useState<AppConfig>({ host: '', port: 7880, nickname: '' });

  // --- App state ---
  const [currentChannelId, setCurrentChannelId] = useState('ch-text-1');
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS);
  const [messages, setMessages] = useState<Message[]>([]);

  // --- LiveKit real voice/video ---
  const liveKit = useLiveKit();

  // --- Modals ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);

  // --- Membros reais conectados ---
  const realMembers = useMemo<Member[]>(() => {
    const list: Member[] = [
      {
        id: 'self',
        name: config.nickname ? `${config.nickname} (Você)` : 'Você',
        avatar: '',
        status: 'online',
        isMuted: liveKit.voiceState.isMuted,
        isDeafened: liveKit.voiceState.isDeafened,
        isStreaming: liveKit.isLocalStreaming,
        hasCamera: liveKit.isCameraEnabled,
      },
    ];

    liveKit.participants.forEach((p) => {
      if (p.identity !== config.nickname && p.identity !== 'self') {
        list.push({
          id: p.identity,
          name: p.name || p.identity,
          avatar: '',
          status: 'online',
          isMuted: p.isMuted,
          isDeafened: false,
          isStreaming: !!p.screenTrack,
          hasCamera: !!p.videoTrack,
        });
      }
    });

    return list;
  }, [config.nickname, liveKit.voiceState.isMuted, liveKit.voiceState.isDeafened, liveKit.isLocalStreaming, liveKit.isCameraEnabled, liveKit.participants]);

  // Sincroniza os membros conectados aos canais de voz dinamicamente
  useEffect(() => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.type === 'voice') {
          if (liveKit.voiceState.isConnected && ch.id === liveKit.voiceState.channelId) {
            const remoteIds = liveKit.participants
              .filter((p) => p.identity !== config.nickname && p.identity !== 'self')
              .map((p) => p.identity);
            return {
              ...ch,
              connectedMembers: ['self', ...remoteIds],
            };
          }
          return {
            ...ch,
            connectedMembers: [],
          };
        }
        return ch;
      })
    );
  }, [liveKit.voiceState.isConnected, liveKit.voiceState.channelId, liveKit.participants, config.nickname]);

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
      setCurrentChannelId(channelId);

      // Obter token do token-server
      const tokenUrl = getTokenServerUrl(config.host);
      const roomName = `voice-${channelId}`;
      console.log(`[App] Solicitando token de ${tokenUrl} para sala ${roomName}...`);

      let token: string;
      try {
        token = await fetchLiveKitToken(tokenUrl, roomName, config.nickname);
        console.log('[App] Token recebido com sucesso');
      } catch (tokenErr) {
        const msg = `Não foi possível obter token do servidor. Verifique se o token-server está rodando em ${tokenUrl}`;
        console.error('[App] Falha ao obter token:', tokenErr);
        alert(msg);
        return;
      }

      // Conectar à sala LiveKit
      const livekitUrl = getLiveKitUrl(config.host, config.port);
      console.log(`[App] Conectando ao LiveKit em ${livekitUrl}...`);

      try {
        await liveKit.connectToRoom(livekitUrl, token, channelId);
        console.log('[App] Conectado ao LiveKit!');
      } catch (lkErr) {
        const msg = `Não foi possível conectar ao LiveKit em ${livekitUrl}. Verifique se o servidor está rodando.`;
        console.error('[App] Falha na conexão LiveKit:', lkErr);
        alert(msg);
      }
    } catch (error) {
      console.error('[App] Erro inesperado ao conectar voz:', error);
      alert('Erro inesperado ao conectar ao canal de voz.');
    }
  }, [config, liveKit]);

  const handleVoiceDisconnect = useCallback(() => {
    liveKit.disconnect();
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
          members={realMembers}
          messages={messages}
          currentChannelId={currentChannelId}
          voiceState={liveKit.voiceState}
          streamState={liveKit.streamState}
          isLocalStreaming={liveKit.isLocalStreaming}
          isCameraEnabled={liveKit.isCameraEnabled}
          activeScreenTrack={liveKit.activeScreenTrack}
          activeStreams={liveKit.activeStreams}
          isMuted={liveKit.voiceState.isMuted}
          isDeafened={liveKit.voiceState.isDeafened}
          onChannelSelect={handleChannelSelect}
          onVoiceConnect={handleVoiceConnect}
          onVoiceDisconnect={handleVoiceDisconnect}
          onSendMessage={handleSendMessage}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
          onToggleCamera={liveKit.toggleCamera}
          onOpenSettings={() => setSettingsOpen(true)}
          onStartStream={handleStartStream}
          onStopStream={handleStopStream}
          onOpenStreamQuality={() => setQualityModalOpen(true)}
          liveKitParticipants={liveKit.participants}
          screenVideoRef={liveKit.screenVideoRef}
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onStartStream={handleStartStream}
      />

      <StreamQualityModal
        isOpen={qualityModalOpen}
        currentPreset={liveKit.streamPreset}
        isStreaming={liveKit.isLocalStreaming}
        onClose={() => setQualityModalOpen(false)}
        onSelectPreset={(preset) => liveKit.setStreamPreset(preset)}
        onStartStreamWithPreset={(preset) => liveKit.startScreenShare(preset)}
      />
    </>
  );
}

export default App;
