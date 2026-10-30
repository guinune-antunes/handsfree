import { useState, useRef, useEffect, useCallback } from 'react';
import { APP_VERSION_BASE, APP_CHANNEL } from '../config/version';
import ShelterMark from './ShelterMark';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartStream: () => void;
  /** Consulta o GitHub; retorna true se houver atualização. */
  onCheckUpdate?: () => Promise<boolean>;
  /** Desconecta do servidor e retorna para a tela inicial. */
  onDisconnect?: () => void;
}

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onStartStream,
  onCheckUpdate,
  onDisconnect,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'stream' | 'about'>('audio');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'found'>('idle');
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [devicesError, setDevicesError] = useState('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      setDevicesError('');

      // Try audio first
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((t) => t.stop());
      } catch {
        // Audio permission denied or already granted
      }

      // Try video separately
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach((t) => t.stop());
      } catch {
        // Video permission denied
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
      if (!selectedCamera) {
        const defaultCam = mappedDevices.find((d) => d.kind === 'videoinput');
        if (defaultCam) setSelectedCamera(defaultCam.deviceId);
      }

      if (mappedDevices.length === 0) {
        setDevicesError('Nenhum dispositivo de mídia encontrado. Verifique as permissões.');
      }
    } catch (err) {
      console.error('[Settings] Device enumeration failed:', err);
      setDevicesError('Não foi possível acessar os dispositivos de áudio/vídeo.');
    }
  }, [selectedMic, selectedSpeaker, selectedCamera]);

  useEffect(() => {
    if (isOpen) {
      enumerateDevices();
    }

    const handler = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handler);
    };
  }, [isOpen, enumerateDevices]);

  // Camera preview
  useEffect(() => {
    if (!isOpen || !selectedCamera || activeTab !== 'video') {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
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
  }, [isOpen, selectedCamera, activeTab]);

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

  const handleShareScreen = () => {
    onStartStream();
    onClose();
  };

  const handleCheckUpdate = async () => {
    if (!onCheckUpdate) return;
    setUpdateStatus('checking');
    const found = await onCheckUpdate();
    setUpdateStatus(found ? 'found' : 'latest');
  };

  if (!isOpen) return null;

  const microphones = devices.filter((d) => d.kind === 'audioinput');
  const speakers = devices.filter((d) => d.kind === 'audiooutput');
  const cameras = devices.filter((d) => d.kind === 'videoinput');

  return (
    <div className="settings-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-modal chamfer-card">
        {/* Navigation Sidebar */}
        <nav className="settings-modal__nav">
          <div className="settings-modal__nav-header">
            <ShelterMark size={20} />
            <span className="settings-modal__nav-title">// SISTEMA & CONFIG</span>
          </div>

          <div className="settings-modal__nav-group">
            <button
              type="button"
              className={`settings-modal__nav-item ${activeTab === 'audio' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => { setActiveTab('audio'); setShowDisconnectConfirm(false); }}
            >
              <span className="settings-modal__nav-prefix">&gt;</span>
              ÁUDIO &amp; MICROFONE
            </button>

            <button
              type="button"
              className={`settings-modal__nav-item ${activeTab === 'video' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => { setActiveTab('video'); setShowDisconnectConfirm(false); }}
            >
              <span className="settings-modal__nav-prefix">&gt;</span>
              VÍDEO &amp; CÂMERA
            </button>

            <button
              type="button"
              className={`settings-modal__nav-item ${activeTab === 'stream' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => { setActiveTab('stream'); setShowDisconnectConfirm(false); }}
            >
              <span className="settings-modal__nav-prefix">&gt;</span>
              TRANSMISSÃO DE TELA
            </button>

            <button
              type="button"
              className={`settings-modal__nav-item ${activeTab === 'about' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => { setActiveTab('about'); setShowDisconnectConfirm(false); }}
            >
              <span className="settings-modal__nav-prefix">&gt;</span>
              SOBRE O SHELTER
            </button>
          </div>

          <div className="settings-modal__nav-separator" />

          {/* Botão de Desconectar com ação real */}
          <button
            type="button"
            className="settings-modal__nav-item settings-modal__nav-item--danger"
            onClick={() => setShowDisconnectConfirm(true)}
            title="Desconectar deste servidor e retornar ao menu de conexão"
          >
            <span className="settings-modal__nav-prefix">&times;</span>
            DESCONECTAR DO SERVIDOR
          </button>
        </nav>

        {/* Scrollable Content Area */}
        <main className="settings-modal__content">
          {/* Close Button */}
          <button
            type="button"
            className="settings-modal__close"
            onClick={onClose}
            title="Fechar (ESC)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Modal de Confirmação de Desconexão */}
          {showDisconnectConfirm && (
            <div className="disconnect-confirm-box tactical-bracket">
              <h3 className="disconnect-confirm-box__title">// CONFIRMAR DESCONEXÃO</h3>
              <p className="disconnect-confirm-box__desc">
                Você será desconectado da chamada e das frequências de dados deste servidor.
              </p>
              <div className="disconnect-confirm-box__actions">
                <button
                  type="button"
                  className="disconnect-confirm-box__btn disconnect-confirm-box__btn--danger"
                  onClick={() => {
                    if (onDisconnect) onDisconnect();
                    else onClose();
                  }}
                >
                  SIM, DESCONECTAR
                </button>
                <button
                  type="button"
                  className="disconnect-confirm-box__btn"
                  onClick={() => setShowDisconnectConfirm(false)}
                >
                  CANCELAR
                </button>
              </div>
            </div>
          )}

          {/* ABA 1: ÁUDIO & MICROFONE */}
          {activeTab === 'audio' && !showDisconnectConfirm && (
            <div className="settings-tab-pane">
              <div className="settings-modal__header-group">
                <span className="tactical-tag">NÓ DE HARDWARE</span>
                <h2 className="settings-modal__section-title">CONFIGURAÇÕES DE ÁUDIO</h2>
              </div>

              {devicesError && (
                <div className="settings-alert settings-alert--error">
                  [ALERTA DE HARDWARE] {devicesError}
                </div>
              )}

              {/* Entrada de Áudio (Mic) */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="settings-mic">
                  DISPOSITIVO DE ENTRADA (MICROFONE)
                </label>
                <select
                  id="settings-mic"
                  className="settings-field__select chamfer-sm"
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
                  Selecione o microfone utilizado nas frequências de voz do Shelter.
                </p>
              </div>

              {/* Volume de Entrada */}
              <div className="settings-field">
                <div className="settings-field__label-row">
                  <label className="settings-field__label">SENSIBILIDADE DE ENTRADA</label>
                  <span className="settings-field__value-badge">{inputVolume}%</span>
                </div>
                <div className="settings-field__slider-wrapper">
                  <input
                    type="range"
                    className="settings-field__slider"
                    min="0"
                    max="100"
                    value={inputVolume}
                    onChange={(e) => setInputVolume(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="settings-divider" />

              {/* Saída de Áudio (Speakers/Headset) */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="settings-speaker">
                  DISPOSITIVO DE SAÍDA (FONES / ALTO-FALANTES)
                </label>
                <select
                  id="settings-speaker"
                  className="settings-field__select chamfer-sm"
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
                  Dispositivo onde o áudio dos outros operadores será reproduzido.
                </p>
              </div>

              {/* Volume de Saída */}
              <div className="settings-field">
                <div className="settings-field__label-row">
                  <label className="settings-field__label">VOLUME PRINCIPAL DE SAÍDA</label>
                  <span className="settings-field__value-badge">{outputVolume}%</span>
                </div>
                <div className="settings-field__slider-wrapper">
                  <input
                    type="range"
                    className="settings-field__slider"
                    min="0"
                    max="100"
                    value={outputVolume}
                    onChange={(e) => setOutputVolume(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: VÍDEO & CÂMERA */}
          {activeTab === 'video' && !showDisconnectConfirm && (
            <div className="settings-tab-pane">
              <div className="settings-modal__header-group">
                <span className="tactical-tag">ÓPTICA &amp; VÍDEO</span>
                <h2 className="settings-modal__section-title">CONFIGURAÇÃO DE CÂMERA</h2>
              </div>

              {/* Seletor de Câmera */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="settings-camera">
                  DISPOSITIVO DE CAPTURA DE VÍDEO
                </label>
                <select
                  id="settings-camera"
                  className="settings-field__select chamfer-sm"
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                >
                  <option value="">Nenhuma / Desativada</option>
                  {cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Preview */}
              <div className="settings-field">
                <label className="settings-field__label">MONITORAMENTO DE VÍDEO EM TEMPO REAL</label>
                <div className="settings-camera-preview chamfer-sm">
                  {cameraStream ? (
                    <video ref={videoPreviewRef} autoPlay playsInline muted />
                  ) : (
                    <div className="settings-camera-preview__placeholder">
                      <span className="settings-camera-preview__placeholder-icon">&#128247;</span>
                      <span>
                        {selectedCamera ? 'Inicializando sensor óptico...' : 'Selecione uma câmera para monitorar'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: TRANSMISSÃO DE TELA */}
          {activeTab === 'stream' && !showDisconnectConfirm && (
            <div className="settings-tab-pane">
              <div className="settings-modal__header-group">
                <span className="tactical-tag">BROADCAST SFU</span>
                <h2 className="settings-modal__section-title">TRANSMISSÃO DE TELA</h2>
              </div>

              <div className="settings-field">
                <p className="settings-field__description" style={{ fontSize: '0.9375rem', marginBottom: 16 }}>
                  Transmita a tela cheia ou janelas de jogos com baixa latência via SFU dedicado. Suporta resolução até <strong>1080p a 60 FPS</strong> com múltiplos operadores assistindo simultaneamente.
                </p>

                <button
                  type="button"
                  className="settings-action-btn chamfer-sm"
                  onClick={handleShareScreen}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  INICIAR COMPARTILHAMENTO DE TELA
                </button>
              </div>
            </div>
          )}

          {/* ABA 4: SOBRE O SHELTER */}
          {activeTab === 'about' && !showDisconnectConfirm && (
            <div className="settings-tab-pane">
              <div className="settings-modal__header-group">
                <span className="tactical-tag">INFORMAÇÕES DO SISTEMA</span>
                <h2 className="settings-modal__section-title">SOBRE O SHELTER</h2>
              </div>

              <div className="settings-about chamfer-sm">
                <img className="settings-about__logo" src="/shelter-logo.png" alt="Shelter" />
                <div className="settings-about__info">
                  <div className="settings-about__name">SHELTER</div>
                  <div className="version-badge">
                    VERSÃO {APP_VERSION_BASE}
                    {APP_CHANNEL && <span className="version-badge__tag">{APP_CHANNEL}</span>}
                  </div>
                  <p className="settings-field__description">
                    Estação de comunicação tática de voz, vídeo e broadcast com criptografia e SFU de alta performance para servidores privados.
                  </p>
                </div>
              </div>

              <div className="settings-divider" />

              <div className="settings-field">
                <label className="settings-field__label">VERIFICAÇÃO DE ATUALIZAÇÕES</label>
                <p className="settings-field__description" style={{ marginBottom: 12 }}>
                  O Shelter consulta automaticamente os releases no repositório do GitHub ao iniciar. Você também pode verificar manualmente abaixo.
                </p>
                <button
                  id="settings-check-update"
                  type="button"
                  className="settings-action-btn settings-action-btn--secondary chamfer-sm"
                  onClick={handleCheckUpdate}
                  disabled={updateStatus === 'checking'}
                >
                  {updateStatus === 'checking' ? 'VERIFICANDO NO GITHUB...' : 'VERIFICAR ATUALIZAÇÕES AGORA'}
                </button>

                {updateStatus === 'latest' && (
                  <p className="settings-about__status settings-about__status--ok">
                    ✓ Sistema operacional na versão mais recente.
                  </p>
                )}
                {updateStatus === 'found' && (
                  <p className="settings-about__status settings-about__status--alert">
                    ! Nova atualização encontrada no GitHub!
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
