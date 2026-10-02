import { useState, useRef, useEffect, useCallback } from 'react';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartStream: () => void;
}

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export default function SettingsModal({ isOpen, onClose, onStartStream }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('voice-video');
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [devicesError, setDevicesError] = useState('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      setDevicesError('');

      // Try audio first (most important for voice chat)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((t) => t.stop());
      } catch {
        // Audio permission denied - try to enumerate anyway
      }

      // Try video separately (optional)
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach((t) => t.stop());
      } catch {
        // Video permission denied - that's ok
      }

      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const mappedDevices = deviceList.map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind === 'audioinput' ? 'Microfone' : d.kind === 'audiooutput' ? 'Alto-falante' : 'Câmera'} (${d.deviceId.slice(0, 8)})`,
        kind: d.kind,
      }));

      setDevices(mappedDevices);

      // Auto-select defaults
      if (!selectedMic) {
        const defaultMic = mappedDevices.find((d) => d.kind === 'audioinput');
        if (defaultMic) setSelectedMic(defaultMic.deviceId);
      }
      if (!selectedSpeaker) {
        const defaultSpeaker = mappedDevices.find((d) => d.kind === 'audiooutput');
        if (defaultSpeaker) setSelectedSpeaker(defaultSpeaker.deviceId);
      }

      if (mappedDevices.length === 0) {
        setDevicesError('Nenhum dispositivo de mídia encontrado. Verifique as permissões.');
      }
    } catch (err) {
      console.error('[Settings] Device enumeration failed:', err);
      setDevicesError('Não foi possível acessar os dispositivos de áudio/vídeo. Verifique as permissões do aplicativo.');
    }
  }, [selectedMic, selectedSpeaker]);

  useEffect(() => {
    if (isOpen) {
      enumerateDevices();
    }

    // Listen for device changes
    const handler = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handler);
    };
  }, [isOpen, enumerateDevices]);

  // Camera preview
  useEffect(() => {
    if (!isOpen || !selectedCamera) {
      // Cleanup stream
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Stop previous stream
        if (cameraStream) {
          cameraStream.getTracks().forEach((t) => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setCameraStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch {
        // Camera not available
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedCamera]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen && cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Share Screen
  const handleShareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: true,
      });
      // For now, just log it - real implementation would send to LiveKit
      console.log('Screen stream obtained:', stream.getTracks());
      onStartStream();
      // Stop after modal closes
      stream.getTracks().forEach((t) => {
        t.addEventListener('ended', () => {
          console.log('Screen share ended');
        });
      });
    } catch {
      // User cancelled or error
    }
  };

  if (!isOpen) return null;

  const microphones = devices.filter((d) => d.kind === 'audioinput');
  const speakers = devices.filter((d) => d.kind === 'audiooutput');
  const cameras = devices.filter((d) => d.kind === 'videoinput');

  return (
    <div className="settings-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-modal">
        {/* Navigation Sidebar */}
        <div className="settings-modal__nav">
          <div className="settings-modal__nav-title">Configurações do App</div>
          <div
            className={`settings-modal__nav-item ${activeTab === 'voice-video' ? 'settings-modal__nav-item--active' : ''}`}
            onClick={() => setActiveTab('voice-video')}
          >
            Voz & Vídeo
          </div>
          <div className="settings-modal__nav-separator" />
          <div className="settings-modal__nav-item" style={{ color: 'var(--red)', fontSize: '0.8125rem' }}>
            Sair
          </div>
        </div>

        {/* Content */}
        <div className="settings-modal__content">
          {/* Close Button */}
          <button className="settings-modal__close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {activeTab === 'voice-video' && (
            <>
              <h2 className="settings-modal__section-title">Voz &amp; Vídeo</h2>

              {devicesError && (
                <div style={{ padding: '8px 12px', background: 'rgba(237, 66, 69, 0.15)', border: '1px solid rgba(237, 66, 69, 0.3)', borderRadius: '4px', color: '#ed4245', fontSize: '0.8125rem', marginBottom: '16px' }}>
                  ⚠️ {devicesError}
                </div>
              )}

              {/* Input Device (Mic) */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="settings-mic">
                  Entrada de Áudio
                </label>
                <select
                  id="settings-mic"
                  className="settings-field__select"
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                >
                  <option value="">Padrão do Sistema</option>
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label}
                    </option>
                  ))}
                </select>
                <p className="settings-field__description">
                  Selecione o microfone que será usado para comunicação por voz.
                </p>
              </div>

              {/* Input Volume */}
              <div className="settings-field">
                <label className="settings-field__label">Volume de Entrada</label>
                <div className="settings-field__slider-wrapper">
                  <input
                    type="range"
                    className="settings-field__slider"
                    min="0"
                    max="100"
                    value={inputVolume}
                    onChange={(e) => setInputVolume(Number(e.target.value))}
                  />
                  <span className="settings-field__slider-value">{inputVolume}%</span>
                </div>
              </div>

              <div className="settings-divider" />

              {/* Output Device (Speaker) */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="settings-speaker">
                  Saída de Áudio
                </label>
                <select
                  id="settings-speaker"
                  className="settings-field__select"
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                >
                  <option value="">Padrão do Sistema</option>
                  {speakers.map((spk) => (
                    <option key={spk.deviceId} value={spk.deviceId}>
                      {spk.label}
                    </option>
                  ))}
                </select>
                <p className="settings-field__description">
                  Escolha por onde o áudio dos seus amigos será reproduzido (headset, caixa de som, etc).
                </p>
              </div>

              {/* Output Volume */}
              <div className="settings-field">
                <label className="settings-field__label">Volume de Saída</label>
                <div className="settings-field__slider-wrapper">
                  <input
                    type="range"
                    className="settings-field__slider"
                    min="0"
                    max="100"
                    value={outputVolume}
                    onChange={(e) => setOutputVolume(Number(e.target.value))}
                  />
                  <span className="settings-field__slider-value">{outputVolume}%</span>
                </div>
              </div>

              <div className="settings-divider" />

              {/* Camera */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="settings-camera">
                  Câmera
                </label>
                <select
                  id="settings-camera"
                  className="settings-field__select"
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Preview */}
              <div className="settings-camera-preview">
                {cameraStream ? (
                  <video ref={videoPreviewRef} autoPlay playsInline muted />
                ) : (
                  <div className="settings-camera-preview__placeholder">
                    <span className="settings-camera-preview__placeholder-icon">📷</span>
                    <span>
                      {selectedCamera ? 'Carregando preview...' : 'Selecione uma câmera para preview'}
                    </span>
                  </div>
                )}
              </div>

              <div className="settings-divider" />

              {/* Screen Share */}
              <div className="settings-field">
                <label className="settings-field__label">
                  Compartilhamento de Tela
                </label>
                <p className="settings-field__description" style={{ marginTop: 0, marginBottom: 8 }}>
                  Compartilhe sua tela inteira ou a janela de um jogo específico.
                </p>
                <button className="settings-share-btn" onClick={handleShareScreen}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
                  </svg>
                  Compartilhar Tela
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
