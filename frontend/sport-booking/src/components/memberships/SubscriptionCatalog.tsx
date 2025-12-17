import type { SubscriptionPlan } from '../../types/auth';
import { formatCurrency } from '../../utils/formatters';
import { SUBSCRIPTION_DETAILS } from '../../constants/subscriptions';

type SubscriptionCatalogProps = {
  plans: SubscriptionPlan[];
  loading?: boolean;
  canPurchase?: boolean;
  onSelectPlan?: (plan: SubscriptionPlan) => void;
};

const SubscriptionCatalog = ({
  plans,
  loading = false,
  canPurchase = false,
  onSelectPlan,
}: SubscriptionCatalogProps) => (
  <section className="detail-card">
    <div className="membership-header">
      <h2>Каталог абонементів</h2>
    </div>
    {loading ? (
      <p>Завантаження планів...</p>
    ) : plans.filter((plan) => plan.type !== 'SINGLE').length === 0 ? (
      <p>Плани тимчасово недоступні. Зверніться до менеджера.</p>
    ) : (
      <div className="plans-grid">
        {plans
          .filter((plan) => plan.type !== 'SINGLE')
          .map((plan) => {
            const meta = SUBSCRIPTION_DETAILS[plan.type];
            const description = meta?.description ?? plan.description;
            const featureList =
              meta?.features ??
              (plan.perks
                ? Object.entries(plan.perks).map(([key, value]) => `${key}: ${String(value)}`)
                : []);
            const basePrice = parseFloat(plan.price);
            const finalPrice = plan.final_price;
            const hasDiscount = finalPrice !== undefined && finalPrice !== null && finalPrice < basePrice;
            return (
          <article className="plan-card" key={plan.id}>
            <p className="plan-type">{plan.type}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {hasDiscount && finalPrice !== undefined && finalPrice !== null ? (
                <>
                  <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="plan-price" style={{ color: 'var(--success)' }}>
                    {formatCurrency(finalPrice.toString())}
                  </span>
                  {plan.discount_percentage && (
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: 'var(--success)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      -{Math.round(plan.discount_percentage)}%
                    </span>
                  )}
                </>
              ) : (
                <p className="plan-price">{formatCurrency(plan.price)}</p>
              )}
            </div>
            {plan.promotion && (
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>
                🎉 {plan.promotion.title}
              </p>
            )}
            <p className="plan-duration">{plan.duration} днів</p>
            {description && <p className="plan-description">{description}</p>}
            {featureList.length > 0 && (
              <ul className="plan-perks">
                {featureList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {onSelectPlan && (
              <button
                type="button"
                className={`primary-button${!canPurchase ? ' primary-button--ghost' : ''}`}
                onClick={() => onSelectPlan(plan)}
              >
                {canPurchase ? 'Оформити' : 'Увійдіть, щоб оформити'}
              </button>
            )}
          </article>
        );
          })}
      </div>
    )}
  </section>
);

export default SubscriptionCatalog;

