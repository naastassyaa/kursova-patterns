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
            return (
          <article className="plan-card" key={plan.id}>
            <p className="plan-type">{plan.type}</p>
            <p className="plan-price">{formatCurrency(plan.price)}</p>
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

