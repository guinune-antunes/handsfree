import type { Member } from '../types';
import { getInitials } from '../data/mockData';
import './MembersList.css';

interface MembersListProps {
  members: Member[];
}

export default function MembersList({ members }: MembersListProps) {
  const onlineMembers = members.filter((m) => m.status !== 'offline');
  const offlineMembers = members.filter((m) => m.status === 'offline');

  // Generate avatar color from name
  const getAvatarColor = (name: string): string => {
    const colors = ['#5865f2', '#3ba55d', '#faa81a', '#ed4245', '#eb459e', '#9b59b6', '#e67e22', '#1abc9c'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderMember = (member: Member) => (
    <div
      key={member.id}
      className={`member-item ${member.status === 'offline' ? 'member-item--offline' : ''}`}
    >
      <div className="member-item__avatar-wrapper">
        <div
          className="member-item__avatar"
          style={{ background: getAvatarColor(member.name) }}
        >
          {getInitials(member.name)}
        </div>
        <div className={`member-item__status-dot member-item__status-dot--${member.status}`} />
      </div>

      <div className="member-item__info">
        <div className="member-item__name">{member.name}</div>
        {member.isStreaming && (
          <div className="member-item__activity">Transmitindo</div>
        )}
      </div>

      <div className="member-item__icons">
        {member.isMuted && (
          <svg className="member-item__icon member-item__icon--muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
        {member.isDeafened && (
          <svg className="member-item__icon member-item__icon--deafened" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
        {member.isStreaming && (
          <svg className="member-item__icon member-item__icon--streaming" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h15A2.5 2.5 0 0 1 22 4.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 15.5v-11zM6 20h12v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V20z" />
          </svg>
        )}
      </div>
    </div>
  );

  return (
    <div className="members-list">
      <div className="members-list__header">
        <span className="members-list__title">Membros — {members.length}</span>
      </div>

      <div className="members-list__scroll">
        {onlineMembers.length > 0 && (
          <div>
            <div className="members-section__title">
              Online — {onlineMembers.length}
            </div>
            {onlineMembers.map(renderMember)}
          </div>
        )}

        {offlineMembers.length > 0 && (
          <div>
            <div className="members-section__title">
              Offline — {offlineMembers.length}
            </div>
            {offlineMembers.map(renderMember)}
          </div>
        )}
      </div>
    </div>
  );
}
