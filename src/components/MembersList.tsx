import type { Member } from '../types';
import { getInitials } from '../data/mockData';
import './MembersList.css';

interface MembersListProps {
  members: Member[];
}

export default function MembersList({ members }: MembersListProps) {
  const onlineMembers = members.filter((m) => m.status !== 'offline');
  const offlineMembers = members.filter((m) => m.status === 'offline');

  const getAvatarColor = (name: string): string => {
    const colors = ['#2f8f4e', '#1f9e8a', '#6f9a12', '#b8860b', '#3b7d6e', '#4f7d2a', '#2e8b8b', '#8a6d1d'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderMember = (member: Member) => (
    <div
      key={member.id}
      className={`operator-card ${member.status === 'offline' ? 'operator-card--offline' : ''}`}
    >
      <div className="operator-card__avatar-wrapper">
        <div
          className="operator-card__avatar chamfer-sm"
          style={{ background: getAvatarColor(member.name) }}
        >
          {getInitials(member.name)}
        </div>
        <div className={`operator-card__status-dot operator-card__status-dot--${member.status}`} />
      </div>

      <div className="operator-card__info">
        <div className="operator-card__name-row">
          <span className="operator-card__badge">OP</span>
          <span className="operator-card__name" title={member.name}>{member.name}</span>
        </div>
        <div className="operator-card__status-line">
          {member.isStreaming ? (
            <span className="operator-card__tag operator-card__tag--stream">TRANSMITINDO TELA</span>
          ) : member.voiceChannelId ? (
            <span className="operator-card__tag operator-card__tag--active">EM CALL // ATIVO</span>
          ) : member.status === 'offline' ? (
            <span className="operator-card__tag">DESCONECTADO</span>
          ) : (
            <span className="operator-card__tag operator-card__tag--active">SINAL ESTÁVEL</span>
          )}
        </div>
      </div>

      <div className="operator-card__telemetry">
        {/* Signal Bars */}
        {member.status !== 'offline' && (
          <div className="operator-card__signal" title="Sinal de Conexão: Forte">
            <span className="operator-card__signal-bar" style={{ height: '4px' }} />
            <span className="operator-card__signal-bar" style={{ height: '8px' }} />
            <span className="operator-card__signal-bar" style={{ height: '12px' }} />
          </div>
        )}

        {/* Hardware Status Icons */}
        <div className="operator-card__icons">
          {member.isMuted && (
            <span className="operator-chip operator-chip--muted" title="Microfone Desativado">
              MUT
            </span>
          )}
          {member.isDeafened && (
            <span className="operator-chip operator-chip--muted" title="Áudio Desativado">
              DEF
            </span>
          )}
          {member.hasCamera && (
            <span className="operator-chip operator-chip--cam" title="Câmera Ativa">
              CAM
            </span>
          )}
          {member.isStreaming && (
            <span className="operator-chip operator-chip--stream" title="Transmitindo Tela">
              SCR
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="members-deck">
      <div className="members-deck__header">
        <span className="members-deck__prefix">//</span>
        <span className="members-deck__title">OPERADORES NA REDE</span>
        <span className="members-deck__count">[{members.length}]</span>
      </div>

      <div className="members-deck__scroll">
        {onlineMembers.length > 0 && (
          <div className="members-deck__group">
            <div className="members-deck__group-title">
              [ NÓS OPERACIONAIS — {onlineMembers.length} ]
            </div>
            {onlineMembers.map(renderMember)}
          </div>
        )}

        {offlineMembers.length > 0 && (
          <div className="members-deck__group">
            <div className="members-deck__group-title">
              [ NÓS FORA DE ALCANCE — {offlineMembers.length} ]
            </div>
            {offlineMembers.map(renderMember)}
          </div>
        )}
      </div>
    </div>
  );
}
