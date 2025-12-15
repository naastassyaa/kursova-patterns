import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchMyLoyalty, fetchMyMemberships, deleteMembership } from '../../api/customer';
import { useSubscriptionPlans } from '../../hooks/useSubscriptionPlans';
import type { Membership } from '../../types/auth';
import MembershipDashboard from '../memberships/MembershipDashboard';
import BookingsPanel from '../bookings/BookingsPanel';
import LoyaltyWidget from '../loyalty/LoyaltyWidget';
import NotificationsCenter from '../notifications/NotificationsCenter';
import MembershipModal from '../memberships/MembershipModal';
import LoadingState from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import ProfileOverview from './ProfileOverview';

export type AccountSection = 'profile' | 'notifications' | 'bookings' | 'subscriptions' | 'loyalty';

const SECTION_TITLES: Record<AccountSection, string> = {
  profile: 'Профіль',
  notifications: 'Повідомлення',
  bookings: 'Бронювання',
  subscriptions: 'Абонементи',
  loyalty: 'Лояльність',
};

type AccountDrawerProps = {
  isOpen: boolean;
  initialSection: AccountSection;
  onClose: () => void;
};

const AccountDrawer = ({ isOpen, initialSection, onClose }: AccountDrawerProps) => {
  const queryClient = useQueryClient();
  const { plans } = useSubscriptionPlans();
  const [isPurchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [pendingMembershipId, setPendingMembershipId] = useState<number | null>(null);
  const [confirmMembership, setConfirmMembership] = useState<Membership | null>(null);

  const membershipsQuery = useQuery({
    queryKey: ['me', 'memberships'],
    queryFn: fetchMyMemberships,
  });

  const loyaltyQuery = useQuery({
    queryKey: ['me', 'loyalty'],
    queryFn: fetchMyLoyalty,
  });

  const openPurchaseModal = (planId?: number) => {
    const fallbackId = planId ?? plans[0]?.id ?? null;
    setSelectedPlanId(fallbackId);
    setPurchaseOpen(true);
  };

  const deactivateMutation = useMutation({
    mutationFn: (membershipId: number) => deleteMembership(membershipId),
    onMutate: (membershipId) => {
      setPendingMembershipId(membershipId);
    },
    onSuccess: () => {
      setConfirmMembership(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'memberships'] });
    },
    onSettled: () => {
      setPendingMembershipId(null);
    },
  });

  const confirmDeactivation = () => {
    if (!confirmMembership) {
      return;
    }
    deactivateMutation.mutate(confirmMembership.id);
  };

  if (!isOpen) {
    return null;
  }

  if (membershipsQuery.isLoading || loyaltyQuery.isLoading) {
    return (
      <div className="drawer-backdrop" onClick={onClose}>
        <div className="account-drawer" onClick={(event) => event.stopPropagation()}>
          <LoadingState message="Завантаження кабінету..." />
        </div>
      </div>
    );
  }

  if (membershipsQuery.isError || loyaltyQuery.isError) {
    return (
      <div className="drawer-backdrop" onClick={onClose}>
        <div className="account-drawer" onClick={(event) => event.stopPropagation()}>
          <ErrorState message="Не вдалося завантажити дані" />
        </div>
      </div>
    );
  }

  const loyalty = loyaltyQuery.data;
  const memberships = membershipsQuery.data ?? [];

  const renderSection = () => {
    switch (initialSection) {
      case 'profile':
        return <ProfileOverview />;
      case 'notifications':
        return <NotificationsCenter showHeading={false} />;
      case 'bookings':
        return <BookingsPanel compact showHeading={false} />;
      case 'subscriptions':
        return (
          <MembershipDashboard
            memberships={memberships}
            onPurchaseClick={(planId) => openPurchaseModal(planId)}
            onDeactivate={(membership) => setConfirmMembership(membership)}
            pendingMembershipId={pendingMembershipId}
            showHeading={false}
          />
        );
      case 'loyalty':
        return <LoyaltyWidget loyalty={loyalty ?? null} showHeading={false} />;
      default:
        return null;
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="account-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <h2>{SECTION_TITLES[initialSection]}</h2>
          <button type="button" className="ghost-button close-button" onClick={onClose} aria-label="Закрити">
            &times;
          </button>
        </header>
        <div className="account-drawer__content">{renderSection()}</div>
      </div>
      {isPurchaseOpen && (
        <MembershipModal
          plans={plans}
          initialPlanId={selectedPlanId ?? plans[0]?.id}
          onClose={() => {
            setPurchaseOpen(false);
            setSelectedPlanId(null);
          }}
        />
      )}
      {confirmMembership && (
        <div className="modal-backdrop" onClick={() => setConfirmMembership(null)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Ви впевнені?</h3>
            <div className="confirm-modal__actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setConfirmMembership(null)}
                disabled={deactivateMutation.isPending}
              >
                Скасувати
              </button>
              <button
                type="button"
                className="ghost-button ghost-button--danger"
                onClick={confirmDeactivation}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? 'Деактивація…' : 'Так'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDrawer;

