import type { LoyaltyAccount } from '../../types/auth';

const LOYALTY_STEPS = [
  { threshold: 0, until: 500, percent: 1, label: '1% бонус' },
  { threshold: 500, until: 1000, percent: 5, label: '5% бонус' },
  { threshold: 1000, until: 5000, percent: 7, label: '7% бонус' },
  { threshold: 5000, until: Infinity, percent: 10, label: '10% бонус' },
];

const getCashbackPercent = (points: number) => {
  let percent = LOYALTY_STEPS[0].percent;
  LOYALTY_STEPS.forEach((step) => {
    if (points >= step.threshold) {
      percent = step.percent;
    }
  });
  return percent;
};

type LoyaltyWidgetProps = {
  loyalty: LoyaltyAccount | null;
  showHeading?: boolean;
};

const LoyaltyWidget = ({ loyalty, showHeading = true }: LoyaltyWidgetProps) => {
  const points = loyalty?.points ?? 0;
  const cashbackPercent = getCashbackPercent(points);

  return (
    <section className="detail-card loyalty-widget">
      {showHeading && <h2>Лояльність</h2>}
      <p>
        Бонуси нараховуються за весь час: навіть якщо ви їх витратили, перехід на новий відсоток
        залишається назавжди. Кожен розділ нижче показує, на якому кроці ви зараз.
      </p>
      <ul className="loyalty-steps">
        {LOYALTY_STEPS.map((step) => {
          const achieved = points >= step.threshold;
          const limitText =
            step.until === Infinity
              ? 'від 5000 балів'
              : `${step.threshold}–${step.until - 1} балів`;
          return (
            <li key={step.percent} className={achieved ? 'active' : ''}>
              <div className="loyalty-step__percent">{step.percent}%</div>
              <div>
                <p className="loyalty-step__label">{step.label}</p>
                <p className="stat-card__label">{limitText}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="loyalty-summary">
        <div>
          <p className="stat-card__label">Бонусів на рахунку</p>
          <span className="stat-card__value">{points}</span>
        </div>
        <div>
          <p className="stat-card__label">Поточний кешбек</p>
          <span className="stat-card__value">{cashbackPercent}%</span>
          <p className="stat-card__label">повертається з кожної оплати</p>
        </div>
      </div>
    </section>
  );
};

export default LoyaltyWidget;


