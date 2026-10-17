import { useState, useRef, useEffect } from 'react';
import type { Message, Channel } from '../types';
import { getInitials, formatTimestamp } from '../data/mockData';
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
      textareaRef.current.style.height = '22px';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
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
    // More than 5 minutes apart
    if (msg.timestamp - prev.timestamp > 5 * 60_000) return true;
    return false;
  };

  // Generate avatar color from name
  const getAvatarColor = (name: string): string => {
    const colors = ['#5865f2', '#3ba55d', '#faa81a', '#ed4245', '#eb459e', '#9b59b6', '#e67e22', '#1abc9c'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel__header">
        <span className="chat-panel__header-icon">#</span>
        <span className="chat-panel__header-name">{channel.name}</span>
        {channel.description && (
          <>
            <div className="chat-panel__header-divider" />
            <span className="chat-panel__header-desc">{channel.description}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="chat-panel__messages">
        <div className="chat-panel__messages-spacer" />

        {/* Welcome */}
        <div className="chat-welcome">
          <div className="chat-welcome__icon">#</div>
          <h2 className="chat-welcome__title">Bem-vindo ao #{channel.name}</h2>
          <p className="chat-welcome__desc">
            Este é o começo do canal #{channel.name}.
            {channel.description ? ` ${channel.description}.` : ''}
          </p>
        </div>

        {/* Message List */}
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
                    className="message__avatar"
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
                    <span className="message__author">{msg.authorName}</span>
                    <span className="message__timestamp">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                )}
                <div className="message__content">{msg.content}</div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-panel__input-area">
        <div className="chat-input">
          <textarea
            ref={textareaRef}
            className="chat-input__field"
            placeholder={`Mensagem #${channel.name}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <div className="chat-input__actions">
            <button className="chat-input__btn" data-tooltip="Emoji" type="button">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm3.5-9c.828 0 1.5-.672 1.5-1.5S16.328 8 15.5 8 14 8.672 14 9.5s.672 1.5 1.5 1.5zm-7 0c.828 0 1.5-.672 1.5-1.5S9.328 8 8.5 8 7 8.672 7 9.5 7.672 11 8.5 11zm3.5 6.5c2.33 0 4.32-1.45 5.12-3.5H6.88c.8 2.05 2.79 3.5 5.12 3.5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
