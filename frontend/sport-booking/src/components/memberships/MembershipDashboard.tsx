import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { acceptInvitation, inviteUserToMembership } from '../../api/customer';
import apiClient from '../../api/client';
import type { Membership, MembershipInvitation } from '../../types/auth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { parseApiError } from '../../utils/apiErrors';

type MembershipDashboardProps = {
  memberships: Membership[];
  onPurchaseClick: (planId?: number) => void;
  onDeactivate?: (membership: Membership) => void;
  showHeading?: boolean;
  pendingMembershipId?: number | null;
};

const CorporateInviteForm = ({ membership, onSuccess }: { membership: Membership; onSuccess: () => void }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: (email: string) => inviteUserToMembership(membership.id, email),
    onSuccess: () => {
      setEmail('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'memberships'] });
      onSuccess();
    },
    onError: (err) => {
      setError(parseApiError(err, 'Не вдалося відправити запрошення'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Введіть email');
      return;
    }
    inviteMutation.mutate(email.trim());
  };

  const teamCount = membership.team_members?.length ?? 0;
  const pendingCount = membership.invitations?.filter((inv) => inv.status === 'PENDING').length ?? 0;
  const canInvite = teamCount + pendingCount < 5;

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--stroke)', borderRadius: '0.75rem' }}>
      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Команда ({teamCount}/5)</h4>
      {membership.team_members && membership.team_members.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Учасники:</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
            {membership.team_members.map((member) => (
              <li key={member.id}>{member.email}</li>
            ))}
          </ul>
        </div>
      )}
      {membership.invitations && membership.invitations.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Запрошення:</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
            {membership.invitations
              .filter((inv) => inv.status === 'PENDING')
              .map((inv) => (
                <li key={inv.id}>{inv.email} (очікує)</li>
              ))}
          </ul>
        </div>
      )}
      {canInvite ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email користувача"
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid var(--stroke)',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
            }}
            disabled={inviteMutation.isPending}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={inviteMutation.isPending || !email.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {inviteMutation.isPending ? 'Відправка...' : 'Запросити'}
          </button>
        </form>
      ) : (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Досягнуто максимальну кількість користувачів (5)
        </p>
      )}
      {error && <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
};

const PendingInvitationsList = () => {
  const queryClient = useQueryClient();
  
  const { data: invitations, isLoading } = useQuery({
    queryKey: ['me', 'memberships', 'pending_invitations'],
    queryFn: async () => {
      const { data } = await apiClient.get<MembershipInvitation[]>('/me/memberships/pending_invitations/');
      return data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'memberships'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'memberships', 'pending_invitations'] });
    },
  });

  if (isLoading) return null;
  if (!invitations || invitations.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--primary)', borderRadius: '0.75rem', backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Запрошення до корпоративних абонементів</h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {invitations.map((invitation) => (
          <li key={invitation.id} style={{ marginBottom: '0.75rem', padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', border: '1px solid var(--stroke)' }}>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
              Запрошення від {invitation.invited_by_name ?? 'користувача'}
            </p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Вас запрошено до корпоративного абонементу
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => acceptMutation.mutate(invitation.token)}
                disabled={acceptMutation.isPending}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                {acceptMutation.isPending ? 'Прийняття...' : 'Прийняти запрошення'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const MembershipDashboard = ({
  memberships,
  onPurchaseClick,
  onDeactivate,
  showHeading = true,
  pendingMembershipId = null,
}: MembershipDashboardProps) => {
  const [expandedMemberships, setExpandedMemberships] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const sortedMemberships = useMemo(
    () =>
      [...memberships].sort(
        (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
      ),
    [memberships],
  );
  const hasMemberships = sortedMemberships.length > 0;

  const toggleExpand = (membershipId: number) => {
    setExpandedMemberships((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) {
        next.delete(membershipId);
      } else {
        next.add(membershipId);
      }
      return next;
    });
  };

  return (
    <section className="detail-card membership-simple">
      <div className="membership-header">
        {showHeading && <h2>Мої абонементи</h2>}
      </div>
      <PendingInvitationsList />
      {!hasMemberships ? (
        <p>У вас ще немає оформлених абонементів. Оберіть план, щоб розпочати.</p>
      ) : (
        <ul className="membership-simple__list">
          {sortedMemberships.map((membership) => (
            <li key={membership.id}>
              <div>
                <p className="membership-title">{membership.subscription_detail.type}</p>
                <p className="stat-card__label">
                  {formatDate(membership.start_date)} – {formatDate(membership.end_date)} ·{' '}
                  {membership.subscription_detail.duration} днів
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span
                    className={`membership-status-badge ${
                      membership.status === 'ACTIVE' ? 'membership-status-badge--valid' : 'membership-status-badge--canceled'
                    }`}
                  >
                    {membership.status === 'ACTIVE' ? 'Валідний' : 'Скасований'}
                  </span>
                  <span className="stat-card__label">
                    {formatCurrency(membership.subscription_detail.price)}
                  </span>
                  {membership.is_corporate && membership.owner_name && (
                    <span className="stat-card__label" style={{ fontSize: '0.8rem' }}>
                      Власник: {membership.owner_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="membership-actions">
                {membership.status === 'ACTIVE' && (
                  <>
                    {membership.is_corporate && membership.owner && (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => toggleExpand(membership.id)}
                      >
                        {expandedMemberships.has(membership.id) ? 'Приховати команду' : 'Управління командою'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      onClick={() => onDeactivate?.(membership)}
                      disabled={!onDeactivate || pendingMembershipId === membership.id}
                    >
                      Деактивувати
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => onPurchaseClick(membership.subscription_detail.id)}
                      disabled={Boolean(pendingMembershipId)}
                    >
                      Продовжити
                    </button>
                  </>
                )}
              </div>
              {membership.is_corporate &&
                membership.owner &&
                expandedMemberships.has(membership.id) &&
                membership.status === 'ACTIVE' && (
                  <CorporateInviteForm
                    membership={membership}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['me', 'memberships'] })}
                  />
                )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default MembershipDashboard;

