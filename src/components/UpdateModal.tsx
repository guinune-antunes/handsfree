import { useEffect } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { UpdateInfo } from '../config/updater';
import { APP_VERSION, formatVersion } from '../config/version';
import ShelterMark from './ShelterMark';
import './UpdateModal.css';

interface UpdateModalProps {
  update: UpdateInfo | null;
  onLater: () => void;
  onIgnore: () => void;
}

/** Abre no navegador padrão; fora do Tauri (dev no browser) cai para window.open. */
async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Reduz o markdown da release a linhas simples para exibição. */
function summarizeNotes(notes: string): string[] {
  return notes
    .split(/\r?\n/)
    .map((l) => l.replace(/^#{1,6}\s*/, '').replace(/^[-*]\s+/, '• ').replace(/[*_`]/g, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

export default function UpdateModal({ update, onLater, onIgnore }: UpdateModalProps) {
  useEffect(() => {
    if (!update) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onLater();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [update, onLater]);

  if (!update) return null;

  const notes = summarizeNotes(update.notes);

  return (
    <div
      className="update-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onLater();
      }}
    >
      <div className="update-modal">
        <div className="hazard-stripe" />

        <div className="update-modal__body">
          <div className="update-modal__head">
            <ShelterMark size={44} />
            <div>
              <h2 id="update-title" className="update-modal__title">
                Atualização disponível
              </h2>
              <p className="update-modal__versions">
                <span className="update-modal__ver update-modal__ver--old">{formatVersion(APP_VERSION)}</span>
                <span className="update-modal__arrow">→</span>
                <span className="update-modal__ver update-modal__ver--new">{formatVersion(update.version)}</span>
                {update.isPrerelease && <span className="update-modal__beta">BETA</span>}
              </p>
            </div>
          </div>

          {notes.length > 0 && (
            <div className="update-modal__notes">
              <div className="update-modal__notes-title">O que há de novo</div>
              <ul>
                {notes.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="update-modal__footer">
          <button id="update-ignore" className="update-btn update-btn--ghost" onClick={onIgnore}>
            Ignorar esta versão
          </button>
          <div className="update-modal__footer-right">
            <button id="update-later" className="update-btn update-btn--secondary" onClick={onLater}>
              Depois
            </button>
            <button
              id="update-download"
              className="update-btn update-btn--primary"
              onClick={() => {
                void openExternal(update.downloadUrl ?? update.releaseUrl);
                onLater();
              }}
            >
              Baixar atualização
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
