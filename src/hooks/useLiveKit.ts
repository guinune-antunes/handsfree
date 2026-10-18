/* ============================================
   useLiveKit — Real-time voice/video hook
   ============================================ */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  ConnectionState,
  type Participant,
} from 'livekit-client';
import type { VoiceState, StreamState, ActiveStream, StreamQualityPreset } from '../types';
import { DEFAULT_STREAM_PRESET } from '../config/streamQuality';

export interface LiveKitParticipant {
  identity: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  screenTrack?: MediaStreamTrack;
}

export interface UseLiveKitReturn {
  // State
  voiceState: VoiceState;
  streamState: StreamState;
  participants: LiveKitParticipant[];
  activeStreams: ActiveStream[];
  isLocalStreaming: boolean;
  isCameraEnabled: boolean;
  streamPreset: StreamQualityPreset;
  connectionState: ConnectionState | 'disconnected';
  activeScreenTrack: MediaStreamTrack | null;

  // Actions
  connectToRoom: (url: string, token: string, channelId: string) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => void;
  toggleCamera: () => Promise<void>;
  startScreenShare: (preset?: StreamQualityPreset) => Promise<void>;
  stopScreenShare: () => void;
  setStreamPreset: (preset: StreamQualityPreset) => void;

  // Refs for attaching media
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useLiveKit(): UseLiveKitReturn {
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteScreenTracksRef = useRef<Map<string, MediaStreamTrack>>(new Map());
  const remoteCameraTracksRef = useRef<Map<string, MediaStreamTrack>>(new Map());
  const localCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  const [voiceState, setVoiceState] = useState<VoiceState>({
    isConnected: false,
    channelId: null,
    isMuted: false,
    isDeafened: false,
  });

  const [streamState, setStreamState] = useState<StreamState>({
    isActive: false,
    streamerId: null,
    type: null,
  });

  const [activeScreenTrack, setActiveScreenTrack] = useState<MediaStreamTrack | null>(null);
  const [activeStreams, setActiveStreams] = useState<ActiveStream[]>([]);
  const [streamPreset, setStreamPreset] = useState<StreamQualityPreset>(DEFAULT_STREAM_PRESET);
  const [participants, setParticipants] = useState<LiveKitParticipant[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState | 'disconnected'>('disconnected');
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  // --- Helper: extract participant info ---
  const extractParticipantInfo = useCallback((participant: Participant): LiveKitParticipant => {
    let audioTrack: MediaStreamTrack | undefined;
    let videoTrack: MediaStreamTrack | undefined;
    let screenTrack: MediaStreamTrack | undefined;

    participant.trackPublications.forEach((pub) => {
      const track = pub.track;
      if (!track) return;
      if (pub.source === Track.Source.Microphone) {
        audioTrack = track.mediaStreamTrack;
      } else if (pub.source === Track.Source.Camera) {
        videoTrack = track.mediaStreamTrack;
      } else if (pub.source === Track.Source.ScreenShare) {
        screenTrack = track.mediaStreamTrack;
      }
    });

    // Fallbacks para garantir que tracks de câmera ou tela não sejam perdidos
    if (!videoTrack) {
      const remoteCam = remoteCameraTracksRef.current.get(participant.identity);
      if (remoteCam) {
        videoTrack = remoteCam;
      } else if (participant === roomRef.current?.localParticipant && localCameraTrackRef.current) {
        videoTrack = localCameraTrackRef.current;
      }
    }

    if (!screenTrack) {
      const remoteScreen = remoteScreenTracksRef.current.get(participant.identity);
      if (remoteScreen) {
        screenTrack = remoteScreen;
      }
    }

    return {
      identity: participant.identity,
      name: participant.name || participant.identity,
      isMuted: participant.isMicrophoneEnabled === false,
      isSpeaking: participant.isSpeaking,
      audioTrack,
      videoTrack,
      screenTrack,
    };
  }, []);

  // --- Helper: update streams list (multi-stream support) ---
  const updateStreams = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setActiveStreams([]);
      setActiveScreenTrack(null);
      setStreamState({ isActive: false, streamerId: null, type: null });
      return;
    }

    const streams: ActiveStream[] = [];

    // 1. Local participant screen share
    if (room.localParticipant) {
      const localScreenPub = Array.from(room.localParticipant.trackPublications.values()).find(
        (pub) => pub.source === Track.Source.ScreenShare && pub.track
      );
      if (localScreenPub && localScreenPub.track) {
        streams.push({
          participantId: room.localParticipant.identity,
          participantName: `${room.localParticipant.name || room.localParticipant.identity} (Você)`,
          track: localScreenPub.track.mediaStreamTrack,
          isLocal: true,
          qualityLabel: '1080p • 60 FPS',
        });
      }
    }

    // 2. Remote participant screen shares from ref (directly subscribed tracks)
    remoteScreenTracksRef.current.forEach((mediaTrack, participantId) => {
      const participant = room.remoteParticipants.get(participantId);
      const name = participant ? (participant.name || participant.identity) : participantId;
      streams.push({
        participantId,
        participantName: name,
        track: mediaTrack,
        isLocal: false,
        qualityLabel: '1080p • 60 FPS',
      });
    });

    // 3. Fallback: inspect remoteParticipants trackPublications
    room.remoteParticipants.forEach((participant) => {
      if (!remoteScreenTracksRef.current.has(participant.identity)) {
        const screenPub = Array.from(participant.trackPublications.values()).find(
          (pub) => pub.source === Track.Source.ScreenShare && pub.track
        );
        if (screenPub && screenPub.track) {
          remoteScreenTracksRef.current.set(participant.identity, screenPub.track.mediaStreamTrack);
          streams.push({
            participantId: participant.identity,
            participantName: participant.name || participant.identity,
            track: screenPub.track.mediaStreamTrack,
            isLocal: false,
            qualityLabel: '1080p • 60 FPS',
          });
        }
      }
    });

    setActiveStreams(streams);

    if (streams.length > 0) {
      setActiveScreenTrack(streams[0].track);
      setStreamState({
        isActive: true,
        streamerId: streams[0].participantId,
        type: 'screen',
      });
    } else {
      setActiveScreenTrack(null);
      setStreamState({
        isActive: false,
        streamerId: null,
        type: null,
      });
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
    }
  }, []);

  // --- Helper: update participants list ---
  const updateParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const parts: LiveKitParticipant[] = [];

    // Add local participant
    if (room.localParticipant) {
      parts.push(extractParticipantInfo(room.localParticipant));
    }

    // Add remote participants
    room.remoteParticipants.forEach((participant) => {
      parts.push(extractParticipantInfo(participant));
    });

    setParticipants(parts);
    updateStreams();
  }, [extractParticipantInfo, updateStreams]);

  // --- Helper: attach remote audio ---
  const attachRemoteAudio = useCallback((participant: RemoteParticipant, publication: RemoteTrackPublication) => {
    if (publication.source !== Track.Source.Microphone) return;
    const track = publication.track;
    if (!track) return;

    const existingEl = audioElementsRef.current.get(participant.identity);
    if (existingEl) {
      existingEl.srcObject = new MediaStream([track.mediaStreamTrack]);
      return;
    }

    const audioEl = new Audio();
    audioEl.srcObject = new MediaStream([track.mediaStreamTrack]);
    audioEl.autoplay = true;
    audioEl.muted = isDeafened;
    audioElementsRef.current.set(participant.identity, audioEl);
  }, [isDeafened]);

  // --- Stop screen share ---
  const stopScreenShare = useCallback(() => {
    const room = roomRef.current;
    if (room && room.localParticipant) {
      room.localParticipant.setScreenShareEnabled(false).catch(() => {});
    }

    setTimeout(() => {
      updateStreams();
      updateParticipants();
    }, 100);
  }, [updateStreams, updateParticipants]);

  // --- Start screen share (1080p 60fps & motion preset support) ---
  const startScreenShare = useCallback(async (customPreset?: StreamQualityPreset) => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;

    const preset = customPreset || streamPreset;

    try {
      console.log(`[LiveKit] Starting 60FPS stream: ${preset.width}x${preset.height} @ ${preset.fps}fps (${preset.bitrate / 1000000} Mbps)`);

      const pub = await room.localParticipant.setScreenShareEnabled(
        true,
        {
          audio: true,
          resolution: {
            width: preset.width,
            height: preset.height,
            frameRate: preset.fps,
          },
          contentHint: 'motion',
        },
        {
          videoCodec: 'h264',
          simulcast: false,
          degradationPreference: 'maintain-framerate',
          screenShareEncoding: {
            maxBitrate: preset.bitrate,
            maxFramerate: preset.fps,
            priority: 'high',
          },
        }
      );

      const track = pub?.track?.mediaStreamTrack;
      if (track) {
        if ('contentHint' in track) {
          track.contentHint = 'motion';
        }
        track.onended = () => {
          stopScreenShare();
        };
      }

      updateStreams();
      updateParticipants();
    } catch (error) {
      console.error('[LiveKit] Screen share failed:', error);
    }
  }, [streamPreset, stopScreenShare, updateStreams, updateParticipants]);

  // --- Connect to a LiveKit room ---
  const connectToRoom = useCallback(async (url: string, token: string, channelId: string) => {
    // Disconnect from previous room if any
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    remoteScreenTracksRef.current.clear();

    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
      stopLocalTrackOnUnpublish: true,
      videoCaptureDefaults: {
        resolution: {
          width: 1920,
          height: 1080,
          frameRate: 60,
        },
      },
      publishDefaults: {
        videoCodec: 'h264',
        simulcast: false,
        degradationPreference: 'maintain-framerate',
        screenShareEncoding: {
          maxBitrate: 4_500_000,
          maxFramerate: 60,
          priority: 'high',
        },
      },
    });

    roomRef.current = room;

    // --- Room event listeners ---
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      setConnectionState(state);
      if (state === ConnectionState.Connected) {
        setVoiceState({
          isConnected: true,
          channelId,
          isMuted: false,
          isDeafened: false,
        });
        updateParticipants();
      } else if (state === ConnectionState.Disconnected) {
        setVoiceState({
          isConnected: false,
          channelId: null,
          isMuted: false,
          isDeafened: false,
        });
        remoteScreenTracksRef.current.clear();
        setActiveScreenTrack(null);
        setActiveStreams([]);
        setStreamState({ isActive: false, streamerId: null, type: null });
        setParticipants([]);
      }
    });

    room.on(RoomEvent.ParticipantConnected, () => updateParticipants());
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      const audioEl = audioElementsRef.current.get(participant.identity);
      if (audioEl) {
        audioEl.srcObject = null;
        audioElementsRef.current.delete(participant.identity);
      }
      remoteScreenTracksRef.current.delete(participant.identity);
      remoteCameraTracksRef.current.delete(participant.identity);
      updateParticipants();
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(`[LiveKit] TrackSubscribed: source=${track.source} from=${participant.identity}`);
      if (track.source === Track.Source.Microphone) {
        attachRemoteAudio(participant, publication);
      } else if (track.source === Track.Source.ScreenShare) {
        remoteScreenTracksRef.current.set(participant.identity, track.mediaStreamTrack);
      } else if (track.source === Track.Source.Camera) {
        remoteCameraTracksRef.current.set(participant.identity, track.mediaStreamTrack);
      }
      updateParticipants();
    });

    room.on(RoomEvent.TrackUnsubscribed, (_track, publication, _participant) => {
      if (publication.source === Track.Source.Microphone) {
        const audioEl = audioElementsRef.current.get(_participant.identity);
        if (audioEl) {
          audioEl.srcObject = null;
          audioElementsRef.current.delete(_participant.identity);
        }
      } else if (publication.source === Track.Source.ScreenShare) {
        remoteScreenTracksRef.current.delete(_participant.identity);
      } else if (publication.source === Track.Source.Camera) {
        remoteCameraTracksRef.current.delete(_participant.identity);
      }
      updateParticipants();
    });

    room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
      if (publication.source === Track.Source.ScreenShare) {
        remoteScreenTracksRef.current.delete(participant.identity);
      } else if (publication.source === Track.Source.Camera) {
        remoteCameraTracksRef.current.delete(participant.identity);
      }
      updateParticipants();
    });

    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare && publication.track) {
        const track = publication.track.mediaStreamTrack;
        if ('contentHint' in track) {
          track.contentHint = 'motion';
        }
        track.onended = () => {
          stopScreenShare();
        };
      }
      updateParticipants();
    });

    room.on(RoomEvent.LocalTrackUnpublished, () => {
      updateParticipants();
    });

    room.on(RoomEvent.TrackMuted, () => updateParticipants());
    room.on(RoomEvent.TrackUnmuted, () => updateParticipants());
    room.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipants());

    // --- Connect ---
    try {
      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      updateParticipants();
    } catch (error) {
      console.error('[LiveKit] Connection failed:', error);
      roomRef.current = null;
      throw error;
    }
  }, [updateParticipants, attachRemoteAudio, stopScreenShare]);

  // --- Disconnect ---
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    audioElementsRef.current.forEach((audioEl) => {
      audioEl.srcObject = null;
    });
    audioElementsRef.current.clear();
    remoteScreenTracksRef.current.clear();
    remoteCameraTracksRef.current.clear();
    localCameraTrackRef.current = null;

    setVoiceState({
      isConnected: false,
      channelId: null,
      isMuted: false,
      isDeafened: false,
    });
    setActiveScreenTrack(null);
    setActiveStreams([]);
    setStreamState({ isActive: false, streamerId: null, type: null });
    setParticipants([]);
    setConnectionState('disconnected');
    setIsDeafened(false);
    setIsCameraEnabled(false);
  }, []);

  // --- Toggle mute ---
  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const newMuted = !voiceState.isMuted;
    await room.localParticipant.setMicrophoneEnabled(!newMuted);
    setVoiceState((prev) => ({ ...prev, isMuted: newMuted }));
    updateParticipants();
  }, [voiceState.isMuted, updateParticipants]);

  // --- Toggle deafen ---
  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    setVoiceState((prev) => ({ ...prev, isDeafened: newDeafened }));

    audioElementsRef.current.forEach((audioEl) => {
      audioEl.muted = newDeafened;
    });

    if (newDeafened && roomRef.current) {
      roomRef.current.localParticipant.setMicrophoneEnabled(false);
      setVoiceState((prev) => ({ ...prev, isMuted: true, isDeafened: true }));
    }
  }, [isDeafened]);

  // --- Toggle camera ---
  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) {
      console.warn('[LiveKit] Cannot toggle camera: room not connected');
      return;
    }

    try {
      const willEnable = !isCameraEnabled;
      if (willEnable) {
        console.log('[LiveKit] Enabling local camera (H.264 720p 30fps)...');
        const pub = await room.localParticipant.setCameraEnabled(
          true,
          {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
          {
            videoCodec: 'h264',
            simulcast: false,
          }
        );
        if (pub && pub.track) {
          localCameraTrackRef.current = pub.track.mediaStreamTrack;
        }
        setIsCameraEnabled(true);
      } else {
        console.log('[LiveKit] Disabling local camera...');
        await room.localParticipant.setCameraEnabled(false);
        localCameraTrackRef.current = null;
        setIsCameraEnabled(false);
      }
      updateParticipants();
    } catch (err) {
      console.error('[LiveKit] Failed to toggle camera:', err);
      alert('Não foi possível acessar a câmera. Verifique se ela está conectada e se a permissão foi concedida.');
    }
  }, [isCameraEnabled, updateParticipants]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      audioElementsRef.current.forEach((el) => { el.srcObject = null; });
      audioElementsRef.current.clear();
      remoteScreenTracksRef.current.clear();
      remoteCameraTracksRef.current.clear();
      localCameraTrackRef.current = null;
    };
  }, []);

  const isLocalStreaming = activeStreams.some((s) => s.isLocal);

  return {
    voiceState,
    streamState,
    participants,
    activeStreams,
    isLocalStreaming,
    isCameraEnabled,
    streamPreset,
    connectionState,
    activeScreenTrack,
    connectToRoom,
    disconnect,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    setStreamPreset,
    screenVideoRef,
  };
}
