import { useQuery } from '@tanstack/react-query';
import { fetchMyPromotions } from '../../api/customer';
import type { Promotion } from '../../api/customer';

const PromotionsList = () => {
  const { data: promotions, isLoading } = useQuery({
    queryKey: ['me', 'promotions'],
    queryFn: fetchMyPromotions,
    enabled: true,
    retry: false,
  });

  if (isLoading) {
    return <div>Завантаження...</div>;
  }

  if (!promotions || promotions.length === 0) {
    return null;
  }

  const formatDiscount = (promo: Promotion) => {
    if (!promo.discount_value) return null;
    if (promo.discount_value_type === 'PERCENTAGE') {
      return `${promo.discount_value}%`;
    }
    return `${promo.discount_value} грн`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <section className="detail-card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Акції та пропозиції</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {promotions.map((promo) => (
          <div
            key={promo.id}
            style={{
              border: '1px solid var(--stroke)',
              borderRadius: '0.75rem',
              padding: '1rem',
              backgroundColor: promo.scope === 'PERSONAL' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{promo.title}</h3>
              {promo.scope === 'PERSONAL' && (
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--primary)',
                    fontWeight: 600,
                  }}
                >
                  Персональна
                </span>
              )}
            </div>
            <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {promo.description}
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {formatDiscount(promo) && (
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--success)',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Знижка: {formatDiscount(promo)}
                </span>
              )}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {formatDate(promo.start_date)} – {formatDate(promo.end_date)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PromotionsList;

