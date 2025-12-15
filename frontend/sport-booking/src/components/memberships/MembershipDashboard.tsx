import { useMemo } from 'react';

import type { Membership } from '../../types/auth';
import { formatCurrency, formatDate } from '../../utils/formatters';

type MembershipDashboardProps = {
  memberships: Membership[];
  onPurchaseClick: (planId?: number) => void;
  onDeactivate?: (membership: Membership) => void;
  showHeading?: boolean;
  pendingMembershipId?: number | null;
};

const MembershipDashboard = ({
  memberships,
  onPurchaseClick,
  onDeactivate,
  showHeading = true,
  pendingMembershipId = null,
}: MembershipDashboardProps) => {
  const sortedMemberships = useMemo(
    () =>
      [...memberships].sort(
        (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
      ),
    [memberships],
  );
  const hasMemberships = sortedMemberships.length > 0;

  return (
    <section className="detail-card membership-simple">
      <div className="membership-header">
        {showHeading && <h2>Мої абонементи</h2>}
      </div>
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
                </div>
              </div>
              <div className="membership-actions">
                {membership.status === 'ACTIVE' && (
                  <>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default MembershipDashboard;

