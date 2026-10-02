import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppConfig } from '../types';
import './LoginScreen.css';

interface LoginScreenProps {
  onConnect: (config: AppConfig) => void;
}

export default function LoginScreen({ onConnect }: LoginScreenProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('7880');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSavedConfig, setHasSavedConfig] = useState(false);

  // Load saved config on mount
  useEffect(() => {
    (async () => {
      try {
        const config = await invoke<AppConfig | null>('load_config');
        if (config) {
          setHost(config.host);
          setPort(String(config.port));
          setNickname(config.nickname);
          setHasSavedConfig(true);
        }
      } catch {
        // No saved config, that's fine
      }
    })();
  }, []);

  const validateFields = (): boolean => {
    if (!host.trim()) {
      setError('Preencha o endereço IP ou hostname.');
      return false;
    }
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('A porta deve ser um número entre 1 e 65535.');
      return false;
    }
    if (!nickname.trim() || nickname.trim().length < 2) {
      setError('O apelido deve ter pelo menos 2 caracteres.');
      return false;
    }
    return true;
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateFields()) return;

    setIsLoading(true);

    const config: AppConfig = {
      host: host.trim(),
      port: parseInt(port, 10),
      nickname: nickname.trim(),
    };

    try {
      // Validate connection via Rust backend
      await invoke('validate_connection', {
        host: config.host,
        port: config.port,
      });

      // Save config for next time
      await invoke('save_config', { config });

      // Transition to dashboard
      onConnect(config);
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : 'Não foi possível conectar ao servidor. Verifique o endereço e tente novamente.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <h1 className="login-card__title">Discord Clone Leve</h1>
          <p className="login-card__subtitle">
            Conecte-se ao servidor para começar
          </p>
        </div>

        <form className="login-form" onSubmit={handleConnect}>
          <div className="login-form__row">
            <div className={`form-group ${!host.trim() && error ? 'form-group--error' : ''}`}>
              <label className="form-group__label" htmlFor="input-host">
                Endereço IP / Host
              </label>
              <div className="form-group__input-wrapper">
                <input
                  id="input-host"
                  className="form-group__input"
                  type="text"
                  placeholder="192.168.1.100"
                  value={host}
                  onChange={(e) => { setHost(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-group__label" htmlFor="input-port">
                Porta
              </label>
              <div className="form-group__input-wrapper">
                <input
                  id="input-port"
                  className="form-group__input"
                  type="text"
                  placeholder="7880"
                  value={port}
                  onChange={(e) => { setPort(e.target.value); setError(''); }}
                />
              </div>
            </div>
          </div>

          <div className={`form-group ${nickname.trim().length > 0 && nickname.trim().length < 2 && error ? 'form-group--error' : ''}`}>
            <label className="form-group__label" htmlFor="input-nickname">
              Seu Apelido
            </label>
            <div className="form-group__input-wrapper">
              <input
                id="input-nickname"
                className="form-group__input"
                type="text"
                placeholder="Como seus amigos vão te chamar?"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setError(''); }}
                maxLength={32}
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <svg className="login-error__icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`login-btn ${isLoading ? 'login-btn--loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="login-btn__spinner" />
            ) : (
              'Conectar'
            )}
          </button>

          {hasSavedConfig && (
            <p className="login-saved-hint">
              Configuração anterior carregada automaticamente
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
