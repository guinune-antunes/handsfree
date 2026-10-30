import { useState, useRef, useEffect } from 'react';
import type { Message, Channel } from '../types';
import { getInitials, formatTimestamp } from '../data/mockData';
import ShelterMark from './ShelterMark';
import './ChatPanel.css';

interface ChatPanelProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export default function ChatPanel({ channel, messages, onSendMessage }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [inputValue]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content) return;
    onSendMessage(content);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine if a message should show a full header (avatar + name)
  const shouldShowHeader = (msg: Message, index: number): boolean => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    if (prev.authorId !== msg.authorId) return true;
    if (msg.timestamp - prev.timestamp > 5 * 60_000) return true;
    return false;
  };

  const getAvatarColor = (name: string): string => {
    const colors = ['#2f8f4e', '#1f9e8a', '#6f9a12', '#b8860b', '#3b7d6e', '#4f7d2a', '#2e8b8b', '#8a6d1d'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="chat-panel">
      {/* Tactical Stream Header */}
      <div className="chat-panel__header">
        <div className="chat-panel__header-tag">
          <span className="chat-panel__header-tag-text">&gt;_</span>
        </div>
        <div className="chat-panel__header-title-block">
          <span className="chat-panel__header-prefix">DAT //</span>
          <span className="chat-panel__header-name">{channel.name.toUpperCase()}</span>
        </div>

        <div className="chat-panel__header-divider" />

        <span className="chat-panel__header-desc">
          {channel.description || 'Terminal criptografado para transmissão de dados e despachos'}
        </span>

        <div className="chat-panel__header-crypto-badge">
          <span className="chat-panel__crypto-dot" />
          AES-GCM // SEGURO
        </div>
      </div>

      {/* Messages Stream */}
      <div className="chat-panel__messages">
        <div className="chat-panel__messages-spacer" />

        {/* Welcome Node Initialization Banner */}
        <div className="chat-welcome tactical-bracket">
          <div className="chat-welcome__header">
            <ShelterMark size={32} />
            <div>
              <div className="chat-welcome__sub">// PROTOCOLO SHELTER INICIALIZADO</div>
              <h2 className="chat-welcome__title">TERMINAL :: DAT-{channel.name.toUpperCase()}</h2>
            </div>
          </div>
          <p className="chat-welcome__desc">
            Comunicação criptografada de ponta a ponta. Todas as transmissões permanecem restritas à rede local e ao seu servidor privado.
            {channel.description ? ` [OBJETIVO: ${channel.description}]` : ''}
          </p>
          <div className="chat-welcome__meta">
            <span className="tactical-tag">NÓ DE DADOS PRIVADO</span>
            <span className="tactical-tag">LOG LOCAL ATIVO</span>
          </div>
        </div>

        {/* Message Log */}
        {messages.map((msg, index) => {
          const showHeader = shouldShowHeader(msg, index);
          return (
            <div
              key={msg.id}
              className={`message ${showHeader ? 'message--has-header' : ''}`}
            >
              {showHeader && (
                <div className="message__avatar-col">
                  <div
                    className="message__avatar chamfer-sm"
                    style={{ background: getAvatarColor(msg.authorName) }}
                  >
                    {getInitials(msg.authorName)}
                  </div>
                </div>
              )}

              {!showHeader && (
                <span className="message__inline-time">
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}

              <div className="message__body">
                {showHeader && (
                  <div className="message__header">
                    <span className="message__callsign-badge">OP</span>
                    <span className="message__author">{msg.authorName}</span>
                    <span className="message__timestamp">
                      [{formatTimestamp(msg.timestamp)}]
                    </span>
                    <span className="message__crypto-tag">[TX // OK]</span>
                  </div>
                )}
                <div className="message__content">{msg.content}</div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Tactical Input Console */}
      <div className="chat-panel__input-area">
        <div className="chat-input chamfer-sm">
          <div className="chat-input__prompt-tag">TX &gt;</div>
          <textarea
            ref={textareaRef}
            className="chat-input__field"
            placeholder={`Transmitir despacho para [${channel.name}]... (ENTER para enviar)`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="chat-input__send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            title="Transmitir mensagem"
          >
            <span className="chat-input__send-text">TRANSMITIR</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
