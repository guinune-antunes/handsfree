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
import type { VoiceState, StreamState } from '../types';

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
  connectionState: ConnectionState | 'disconnected';

  // Actions
  connectToRoom: (url: string, token: string, channelId: string) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;

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
  }, [extractParticipantInfo]);

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

  // --- Helper: attach screen share ---
  const attachScreenShare = useCallback((participant: Participant, publication: RemoteTrackPublication) => {
    if (publication.source !== Track.Source.ScreenShare) return;
    const track = publication.track;
    if (!track || !screenVideoRef.current) return;

    screenVideoRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
    screenVideoRef.current.play().catch(() => {});

    setStreamState({
      isActive: true,
      streamerId: participant.identity,
      type: 'screen',
    });
  }, []);

  // --- Connect to a LiveKit room ---
  const connectToRoom = useCallback(async (url: string, token: string, channelId: string) => {
    // Disconnect from previous room if any
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
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
      } else if (track.source === Track.Source.ScreenShare) {
        attachScreenShare(participant, publication);
      }
      updateParticipants();
    });

    room.on(RoomEvent.TrackUnsubscribed, (_track, publication, participant) => {
      if (publication.source === Track.Source.Microphone) {
        const audioEl = audioElementsRef.current.get(participant.identity);
        if (audioEl) {
          audioEl.srcObject = null;
          audioElementsRef.current.delete(participant.identity);
        }
      } else if (publication.source === Track.Source.ScreenShare) {
        if (streamState.streamerId === participant.identity) {
          setStreamState({ isActive: false, streamerId: null, type: null });
        }
      }
      updateParticipants();
    });

    room.on(RoomEvent.TrackMuted, () => updateParticipants());
    room.on(RoomEvent.TrackUnmuted, () => updateParticipants());
    room.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipants());
    room.on(RoomEvent.LocalTrackPublished, () => updateParticipants());

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
  }, [updateParticipants, attachRemoteAudio, attachScreenShare, streamState.streamerId]);

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

  // --- Start screen share ---
  const startScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    try {
      await room.localParticipant.setScreenShareEnabled(true);
      setStreamState({
        isActive: true,
        streamerId: room.localParticipant.identity,
        type: 'screen',
      });

      // Attach local screen share to video element
      const screenPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      if (screenPub?.track && screenVideoRef.current) {
        screenVideoRef.current.srcObject = new MediaStream([screenPub.track.mediaStreamTrack]);
        screenVideoRef.current.play().catch(() => {});
      }
    } catch (error) {
      console.error('[LiveKit] Screen share failed:', error);
    }
  }, []);

  // --- Stop screen share ---
  const stopScreenShare = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    room.localParticipant.setScreenShareEnabled(false);
    setStreamState({ isActive: false, streamerId: null, type: null });

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
  }, []);

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
    connectionState,
    connectToRoom,
    disconnect,
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    screenVideoRef,
  };
}
