import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import SubscriptionCatalog from '../components/memberships/SubscriptionCatalog';
import { useSubscriptionPlans } from '../hooks/useSubscriptionPlans';
import ErrorState from '../components/common/ErrorState';
import { useAuth } from '../context/AuthContext';
import MembershipModal from '../components/memberships/MembershipModal';

const SubscriptionsPage = () => {
  const { plans, isLoading, isError } = useSubscriptionPlans();
  const { isAuthenticated } = useAuth();
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handlePlanSelect = (plan: typeof plans[number]) => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    setSelectedPlanId(plan.id);
    setModalOpen(true);
  };

  const primaryPlan = selectedPlanId ? plans.find((plan: typeof plans[number]) => plan.id === selectedPlanId) ?? null : null;
  const modalPlanList = primaryPlan
    ? [primaryPlan, ...plans.filter((plan: typeof plans[number]) => plan.id !== primaryPlan.id)]
    : plans;

  return (
    <div className="detail-page">
      <section className="detail-card">
        <h1 className="detail-card__title">Обери свій спосіб тренуватись</h1>
        <p>
          Оформлюйте активні плани онлайн або звертайтесь до менеджера для індивідуальних пропозицій.
        </p>
      </section>
      {isError && plans.length === 0 ? (
        <ErrorState message="Немає доступу до каталогу. Зверніться до адміністратора." />
      ) : (
        <>
          <SubscriptionCatalog
            plans={plans}
            loading={isLoading}
            canPurchase={isAuthenticated}
            onSelectPlan={handlePlanSelect}
          />
          {showSuccessMessage && (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success)',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
                color: 'var(--success)',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1.05rem' }}>Абонемент успішно оформлено!</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                Ви отримаєте сповіщення з деталями абонементу. Перевірте розділ "Абонементи" для перегляду активних планів.
              </p>
            </div>
          )}
          {isModalOpen && (
            <MembershipModal
              plans={modalPlanList}
              initialPlanId={selectedPlanId}
              onClose={() => {
                setModalOpen(false);
                // Show success message after modal closes
                setTimeout(() => {
                  setShowSuccessMessage(true);
                  setTimeout(() => setShowSuccessMessage(false), 5000);
                }, 300);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default SubscriptionsPage;

