import { useState, useEffect, useCallback } from 'react';

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

/**
 * Hook customizado para enumerar dispositivos de mídia (microfones, alto-falantes, câmeras).
 * Re-enumera automaticamente quando dispositivos são conectados/desconectados.
 */
export function useMediaDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enumerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        deviceList.map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind} (${d.deviceId.slice(0, 8)})`,
          kind: d.kind,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar dispositivos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    enumerate();

    const handler = () => enumerate();
    navigator.mediaDevices?.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handler);
    };
  }, [enumerate]);

  const microphones = devices.filter((d) => d.kind === 'audioinput');
  const speakers = devices.filter((d) => d.kind === 'audiooutput');
  const cameras = devices.filter((d) => d.kind === 'videoinput');

  return {
    devices,
    microphones,
    speakers,
    cameras,
    isLoading,
    error,
    refresh: enumerate,
  };
}
