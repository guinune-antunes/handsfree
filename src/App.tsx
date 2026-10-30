import { useState, useCallback, useEffect, useMemo } from 'react';
import type { AppConfig, Screen, Channel, Member, Message, StreamQualityPreset } from './types';
import { MOCK_CHANNELS } from './data/mockData';
import { getLiveKitUrl, fetchLiveKitToken, getTokenServerUrl } from './config/livekit';
import { useLiveKit } from './hooks/useLiveKit';
import { syncPresence, sendServerMessage, fetchServerMessages, type RemoteOperator } from './config/serverApi';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import StreamQualityModal from './components/StreamQualityModal';
import UpdateModal from './components/UpdateModal';
import { checkForUpdate, ignoreUpdate, isUpdateIgnored } from './config/updater';
import type { UpdateInfo } from './config/updater';
import './App.css';

function App() {
  // --- Screen routing ---
  const [screen, setScreen] = useState<Screen>('login');
  const [config, setConfig] = useState<AppConfig>({ host: '', port: 7880, nickname: '' });

  // --- App state ---
  const [currentChannelId, setCurrentChannelId] = useState('ch-text-1');
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS);
  const [messages, setMessages] = useState<Message[]>([]);

  // --- Estado de presença remota do servidor ---
  const [remoteOperators, setRemoteOperators] = useState<RemoteOperator[]>([]);
  const [serverVoiceRooms, setServerVoiceRooms] = useState<Record<string, string[]>>({});

  // --- Handler para mensagens instantâneas recebidas via DataChannel do LiveKit ---
  const handleLiveKitChatMessage = useCallback(
    (incoming: any) => {
      if (!incoming || !incoming.id || !incoming.content) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        const isSelf = incoming.authorName === config.nickname;
        return [
          ...prev,
          {
            id: incoming.id,
            channelId: incoming.channelId || 'ch-text-1',
            authorId: isSelf ? 'self' : incoming.authorName,
            authorName: isSelf ? `${config.nickname} (Você)` : incoming.authorName,
            authorAvatar: '',
            content: incoming.content,
            timestamp: incoming.timestamp || Date.now(),
          },
        ];
      });
    },
    [config.nickname]
  );

  // --- LiveKit real voice/video com data-channel ---
  const liveKit = useLiveKit(handleLiveKitChatMessage);

  // --- Modals ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);

  // --- Atualização (GitHub Releases) ---
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);

  // --- Membros reais conectados (combina você, LiveKit e operadores do servidor) ---
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
        voiceChannelId: liveKit.voiceState.isConnected ? liveKit.voiceState.channelId : null,
      },
    ];

    const added = new Set<string>(['self', config.nickname]);

    // 1. Participantes na chamada de voz atual via LiveKit
    liveKit.participants.forEach((p) => {
      if (!p.isLocal && p.identity !== config.nickname && p.identity !== 'self') {
        added.add(p.identity);
        list.push({
          id: p.identity,
          name: p.name || p.identity,
          avatar: '',
          status: 'online',
          isMuted: p.isMuted,
          isDeafened: false,
          isStreaming: !!p.screenTrack,
          hasCamera: !!p.videoTrack,
          voiceChannelId: liveKit.voiceState.channelId,
        });
      }
    });

    // 2. Operadores online no servidor detectados pelo heartbeat /api/presence
    remoteOperators.forEach((op) => {
      if (!added.has(op.name)) {
        added.add(op.name);
        list.push({
          id: op.name,
          name: op.name,
          avatar: '',
          status: op.status,
          isMuted: false,
          isDeafened: false,
          isStreaming: false,
          voiceChannelId: op.isVoiceConnected ? op.voiceChannelId : null,
        });
      }
    });

    return list;
  }, [
    config.nickname,
    liveKit.voiceState.isMuted,
    liveKit.voiceState.isDeafened,
    liveKit.voiceState.isConnected,
    liveKit.voiceState.channelId,
    liveKit.isLocalStreaming,
    liveKit.isCameraEnabled,
    liveKit.participants,
    remoteOperators,
  ]);

  // Sincroniza quem está nos canais de voz dinamicamente para quem acabou de conectar no IP
  useEffect(() => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.type === 'voice') {
          const membersInRoom = new Set<string>();

          // Operadores cadastrados no servidor nesta frequência
          if (serverVoiceRooms[ch.id]) {
            serverVoiceRooms[ch.id].forEach((nick) => {
              if (nick === config.nickname) {
                membersInRoom.add('self');
              } else {
                membersInRoom.add(nick);
              }
            });
          }

          // Se nós estamos conectados a esta sala no LiveKit
          if (liveKit.voiceState.isConnected && ch.id === liveKit.voiceState.channelId) {
            membersInRoom.add('self');
            liveKit.participants.forEach((p) => {
              if (!p.isLocal && p.identity !== config.nickname && p.identity !== 'self') {
                membersInRoom.add(p.identity);
              }
            });
          }

          return {
            ...ch,
            connectedMembers: Array.from(membersInRoom),
          };
        }
        return ch;
      })
    );
  }, [
    liveKit.voiceState.isConnected,
    liveKit.voiceState.channelId,
    liveKit.participants,
    serverVoiceRooms,
    config.nickname,
  ]);

  // --- Handlers de Conexão ---
  const handleConnect = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    setScreen('dashboard');

    // Ao conectar no servidor, verifica em segundo plano se há versão nova no GitHub
    checkForUpdate().then((update) => {
      if (update && !isUpdateIgnored(update.tag)) {
        setAvailableUpdate(update);
      }
    });
  }, []);

  // --- Loop de Heartbeat de Presença (Rastreia quem está conectado e em call no IP) ---
  useEffect(() => {
    if (screen !== 'dashboard' || !config.host) return;

    let cancelled = false;

    const doSync = async () => {
      try {
        const pres = await syncPresence(config.host, {
          nickname: config.nickname,
          isVoiceConnected: liveKit.voiceState.isConnected,
          voiceChannelId: liveKit.voiceState.channelId,
        });

        if (cancelled || !pres) return;

        if (pres.operators) {
          setRemoteOperators(pres.operators);
        }
        if (pres.voiceRooms) {
          setServerVoiceRooms(pres.voiceRooms);
        }
      } catch (e) {
        console.warn('[App] Presença falhou:', e);
      }
    };

    doSync();
    const interval = setInterval(doSync, 3500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [screen, config.host, config.nickname, liveKit.voiceState.isConnected, liveKit.voiceState.channelId]);

  // --- Loop de Sincronização de Mensagens entre Clientes ---
  useEffect(() => {
    if (screen !== 'dashboard' || !config.host) return;

    let cancelled = false;

    const fetchMsgs = async () => {
      try {
        const serverMsgs = await fetchServerMessages(config.host);
        if (cancelled || !serverMsgs || serverMsgs.length === 0) return;

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const toAdd: Message[] = [];

          for (const sm of serverMsgs) {
            if (!existingIds.has(sm.id)) {
              const isSelf = sm.authorName === config.nickname;
              toAdd.push({
                id: sm.id,
                channelId: sm.channelId,
                authorId: isSelf ? 'self' : sm.authorName,
                authorName: isSelf ? `${config.nickname} (Você)` : sm.authorName,
                authorAvatar: '',
                content: sm.content,
                timestamp: sm.timestamp,
              });
            }
          }

          if (toAdd.length === 0) return prev;
          return [...prev, ...toAdd];
        });
      } catch {
        // Silencioso em caso de erro de rede
      }
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 1800);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [screen, config.host, config.nickname]);

  /** Verificação manual (Configurações > Sobre). */
  const handleManualUpdateCheck = useCallback(async (): Promise<boolean> => {
    const update = await checkForUpdate();
    if (update) {
      setAvailableUpdate(update);
      return true;
    }
    return false;
  }, []);

  const handleChannelSelect = useCallback((channelId: string) => {
    setCurrentChannelId(channelId);
  }, []);

  const handleVoiceConnect = useCallback(
    async (channelId: string) => {
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
        } catch (lkErr: any) {
          const errorMsg = lkErr?.message || String(lkErr);
          console.error('[App] Falha na conexão LiveKit:', lkErr);

          let details = `Não foi possível manter a conexão com o LiveKit em ${livekitUrl}.\n\nDetalhes: ${errorMsg}`;
          if (
            errorMsg.toLowerCase().includes('ice') ||
            errorMsg.toLowerCase().includes('timeout') ||
            errorMsg.toLowerCase().includes('peer')
          ) {
            details +=
              '\n\n⚠️ Causa provável: As portas de mídia WebRTC (UDP 50000-60000 ou TCP 7881) estão bloqueadas pelo roteador do servidor ou pelo firewall/provedor deste usuário.';
          }
          alert(details);
        }
      } catch (error: any) {
        console.error('[App] Erro inesperado ao conectar voz:', error);
        alert(`Erro inesperado ao conectar ao canal de voz: ${error?.message || error}`);
      }
    },
    [config, liveKit]
  );

  const handleVoiceDisconnect = useCallback(() => {
    liveKit.disconnect();
  }, [liveKit]);

  // Transmissão de Mensagens: Local + WebRTC DataChannel + Server HTTP para todos os usuários
  const handleSendMessage = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text) return;

      const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newMsg: Message = {
        id: msgId,
        authorId: 'self',
        authorName: config.nickname ? `${config.nickname} (Você)` : 'Você',
        authorAvatar: '',
        content: text,
        timestamp: Date.now(),
        channelId: currentChannelId,
      };

      // 1. Atualização otimista na tela local
      setMessages((prev) => [...prev, newMsg]);

      // 2. Transmissão imediata via WebRTC DataChannel (se estiver na mesma frequência)
      liveKit.publishChatMessage({
        id: msgId,
        channelId: currentChannelId,
        authorName: config.nickname || 'Operador',
        content: text,
        timestamp: newMsg.timestamp,
      }).catch(() => {});

      // 3. Persistência e distribuição no servidor para todos os nós
      if (config.host) {
        sendServerMessage(config.host, {
          channelId: currentChannelId,
          authorName: config.nickname || 'Operador',
          content: text,
        }).catch((e) => console.warn('[App] Erro ao enviar mensagem para servidor:', e));
      }
    },
    [config.nickname, config.host, currentChannelId, liveKit]
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

  // Seleção e alteração dinâmica de qualidade
  const handleSelectStreamPreset = useCallback(
    (preset: StreamQualityPreset) => {
      liveKit.setStreamPreset(preset);
      if (liveKit.isLocalStreaming) {
        liveKit.changeStreamQuality(preset);
      }
    },
    [liveKit]
  );

  const handleApplyStreamPreset = useCallback(
    (preset: StreamQualityPreset) => {
      liveKit.setStreamPreset(preset);
      if (liveKit.isLocalStreaming) {
        liveKit.changeStreamQuality(preset);
      } else {
        liveKit.startScreenShare(preset);
      }
    },
    [liveKit]
  );

  const handleDisconnectServer = useCallback(() => {
    liveKit.disconnect();
    setSettingsOpen(false);
    setScreen('login');
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
        onCheckUpdate={handleManualUpdateCheck}
        onDisconnect={handleDisconnectServer}
        currentPreset={liveKit.streamPreset}
        onSelectPreset={handleSelectStreamPreset}
        isStreaming={liveKit.isLocalStreaming}
      />

      <UpdateModal
        update={availableUpdate}
        onLater={() => setAvailableUpdate(null)}
        onIgnore={() => {
          if (availableUpdate) ignoreUpdate(availableUpdate.tag);
          setAvailableUpdate(null);
        }}
      />

      <StreamQualityModal
        isOpen={qualityModalOpen}
        currentPreset={liveKit.streamPreset}
        isStreaming={liveKit.isLocalStreaming}
        onClose={() => setQualityModalOpen(false)}
        onSelectPreset={handleSelectStreamPreset}
        onStartStreamWithPreset={handleApplyStreamPreset}
      />
    </>
  );
}

export default App;
