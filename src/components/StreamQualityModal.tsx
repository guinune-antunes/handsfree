import { useState } from 'react';
import type { StreamQualityPreset } from '../types';
import { STREAM_QUALITY_PRESETS } from '../config/streamQuality';
import './StreamQualityModal.css';

interface StreamQualityModalProps {
  isOpen: boolean;
  currentPreset: StreamQualityPreset;
  isStreaming: boolean;
  onClose: () => void;
  onSelectPreset: (preset: StreamQualityPreset) => void;
  onStartStreamWithPreset: (preset: StreamQualityPreset) => void;
}

export default function StreamQualityModal({
  isOpen,
  currentPreset,
  isStreaming,
  onClose,
  onSelectPreset,
  onStartStreamWithPreset,
}: StreamQualityModalProps) {
  const [selected, setSelected] = useState<StreamQualityPreset>(currentPreset);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectPreset(selected);
    if (!isStreaming) {
      onStartStreamWithPreset(selected);
    }
    onClose();
  };

  return (
    <div className="stream-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="stream-modal">
        <div className="stream-modal__header">
          <div className="stream-modal__title-group">
            <span className="stream-modal__icon">🎥</span>
            <div>
              <h3 className="stream-modal__title">Configuração de Transmissão de Tela</h3>
              <p className="stream-modal__subtitle">Escolha a resolução e taxa de quadros (FPS) desejada</p>
            </div>
          </div>
          <button className="stream-modal__close" onClick={onClose} title="Fechar">✕</button>
        </div>

        <div className="stream-modal__content">
          <div className="stream-modal__presets">
            {STREAM_QUALITY_PRESETS.map((preset) => {
              const isCurrent = selected.id === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`stream-preset-card ${isCurrent ? 'stream-preset-card--active' : ''}`}
                  onClick={() => setSelected(preset)}
                >
                  <div className="stream-preset-card__radio">
                    {isCurrent && <div className="stream-preset-card__radio-inner" />}
                  </div>
                  <div className="stream-preset-card__info">
                    <div className="stream-preset-card__label">
                      {preset.label}
                      {preset.id === '1080p60' && <span className="stream-preset-card__tag">Padrão 60fps</span>}
                    </div>
                    <div className="stream-preset-card__meta">
                      Resolução: {preset.width}x{preset.height} • {preset.fps} FPS • Bitrate: {preset.bitrate / 1000000} Mbps
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="stream-modal__footer">
          <button className="stream-modal__btn stream-modal__btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="stream-modal__btn stream-modal__btn--primary" onClick={handleConfirm}>
            {isStreaming ? 'Salvar Configuração' : '🚀 Iniciar Transmissão'}
          </button>
        </div>
      </div>
    </div>
  );
}
