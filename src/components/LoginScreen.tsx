import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppConfig } from '../types';
import { APP_VERSION_BASE, APP_CHANNEL } from '../config/version';
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

    let cleanHost = host.trim();
    // Remove protocolos comuns caso o usuário tenha colado url completa
    cleanHost = cleanHost.replace(/^(https?|wss?):\/\//i, '');
    cleanHost = cleanHost.split('/')[0].trim();

    let effectivePort = parseInt(port, 10);
    // Se colou IP:PORTA no campo de host, separa e atualiza
    if (cleanHost.includes(':')) {
      const parts = cleanHost.split(':');
      cleanHost = parts[0].trim();
      const parsed = parseInt(parts[1], 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 65535) {
        effectivePort = parsed;
        setPort(String(parsed));
      }
    }
    setHost(cleanHost);

    const config: AppConfig = {
      host: cleanHost,
      port: effectivePort,
      nickname: nickname.trim(),
    };

    try {
      // Valida se o IP e a porta TCP 7880 respondem
      await invoke('validate_connection', {
        host: config.host,
        port: config.port,
      });

      // Salva configuração válida
      await invoke('save_config', { config });

      // Avança para o painel
      onConnect(config);
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : `Não foi possível conectar a ${config.host}:${config.port}. Verifique se as portas 7880 e 3001 estão abertas no roteador/firewall do servidor.`;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="hazard-stripe" />
        <div className="login-card__inner">
        <div className="login-card__header">
          <img className="login-card__logo" src="/shelter-logo.png" alt="Shelter" draggable={false} />
          <h1 className="login-card__title">Shelter</h1>
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

        <div className="login-card__footer">
          <span className="version-badge">
            v{APP_VERSION_BASE}
            {APP_CHANNEL && <span className="version-badge__tag">{APP_CHANNEL}</span>}
          </span>
        </div>
        </div>
      </div>
    </div>
  );
}
