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
  streamPreset: StreamQualityPreset;
  connectionState: ConnectionState | 'disconnected';
  activeScreenTrack: MediaStreamTrack | null;

  // Actions
  connectToRoom: (url: string, token: string, channelId: string) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => void;
  startScreenShare: (preset?: StreamQualityPreset) => Promise<void>;
  stopScreenShare: () => void;
  setStreamPreset: (preset: StreamQualityPreset) => void;

  // Refs for attaching media
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useLiveKit(): UseLiveKitReturn {
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
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

    // 2. Remote participants screen share
    room.remoteParticipants.forEach((participant) => {
      const remoteScreenPub = Array.from(participant.trackPublications.values()).find(
        (pub) => pub.source === Track.Source.ScreenShare && pub.track
      );
      if (remoteScreenPub && remoteScreenPub.track) {
        streams.push({
          participantId: participant.identity,
          participantName: participant.name || participant.identity,
          track: remoteScreenPub.track.mediaStreamTrack,
          isLocal: false,
          qualityLabel: '1080p • 60 FPS',
        });
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

    // Refresh streams immediately
    setTimeout(() => {
      updateStreams();
      updateParticipants();
    }, 100);
  }, [updateStreams, updateParticipants]);

  // --- Start screen share (1080p 60fps & custom preset support) ---
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
          contentHint: 'motion', // Prioritizes smooth 60fps motion for games and desktop
        },
        {
          simulcast: false, // Prevents LiveKit from dropping to 360p
          degradationPreference: 'maintain-framerate', // Never sacrifice 60 FPS
          screenShareEncoding: {
            maxBitrate: preset.bitrate,
            maxFramerate: preset.fps,
            priority: 'high',
          },
        }
      );

      const track = pub?.track?.mediaStreamTrack;
      if (track) {
        // Enforce motion content hint directly on WebRTC track
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

    // CRUCIAL: Disable adaptiveStream and dynacast so LiveKit does NOT throttle or drop to 360p/720p!
    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
      videoCaptureDefaults: {
        resolution: {
          width: 1920,
          height: 1080,
          frameRate: 60,
        },
      },
      publishDefaults: {
        simulcast: false,
        degradationPreference: 'maintain-framerate',
        screenShareEncoding: {
          maxBitrate: 8_000_000,
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
        setActiveScreenTrack(null);
        setActiveStreams([]);
        setStreamState({ isActive: false, streamerId: null, type: null });
        setParticipants([]);
      }
    });

    room.on(RoomEvent.ParticipantConnected, () => updateParticipants());
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      // Clean up audio element
      const audioEl = audioElementsRef.current.get(participant.identity);
      if (audioEl) {
        audioEl.srcObject = null;
        audioElementsRef.current.delete(participant.identity);
      }
      updateParticipants();
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.source === Track.Source.Microphone) {
        attachRemoteAudio(participant, publication);
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
      // Enable microphone after connecting
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
    // Clean up all audio elements
    audioElementsRef.current.forEach((audioEl) => {
      audioEl.srcObject = null;
    });
    audioElementsRef.current.clear();

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

    // Mute/unmute all remote audio elements
    audioElementsRef.current.forEach((audioEl) => {
      audioEl.muted = newDeafened;
    });

    // If deafening, also mute microphone
    if (newDeafened && roomRef.current) {
      roomRef.current.localParticipant.setMicrophoneEnabled(false);
      setVoiceState((prev) => ({ ...prev, isMuted: true, isDeafened: true }));
    }
  }, [isDeafened]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      audioElementsRef.current.forEach((el) => { el.srcObject = null; });
      audioElementsRef.current.clear();
    };
  }, []);

  return {
    voiceState,
    streamState,
    participants,
    activeStreams,
    streamPreset,
    connectionState,
    activeScreenTrack,
    connectToRoom,
    disconnect,
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    setStreamPreset,
    screenVideoRef,
  };
}
