import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchCenters, fetchHalls } from '../api/catalog';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import type { SportCenter } from '../types/catalog';

const CentersPage = () => {
  // Отримуємо всі центри напряму
  const { data: allCenters, isLoading: centersLoading, isError: centersError, refetch: refetchCenters } = useQuery({
    queryKey: ['centers', 'all'],
    queryFn: fetchCenters,
  });

  // Також отримуємо центри з залів (для сумісності)
  const { data: halls } = useQuery({
    queryKey: ['halls', 'for-centers'],
    queryFn: fetchHalls,
  });

  // Об'єднуємо центри: спочатку всі з API, потім додаємо ті, що є тільки в залах
  const centers = useMemo<SportCenter[]>(() => {
    const map = new Map<number, SportCenter>();
    
    // Додаємо всі центри з API (включаючи ті, що без залів)
    if (allCenters) {
      allCenters.forEach((center) => {
        map.set(center.id, center);
      });
    }
    
    // Додаємо центри з залів (якщо якісь не були в API)
    if (halls) {
      halls.forEach((hall) => {
        if (!map.has(hall.center.id)) {
          map.set(hall.center.id, hall.center);
        }
      });
    }
    
    return Array.from(map.values());
  }, [allCenters, halls]);

  const isLoading = centersLoading;
  const isError = centersError;
  const refetch = refetchCenters;

  if (isLoading) {
    return <LoadingState message="Завантаження центрів..." />;
  }

  if (isError) {
    return <ErrorState message="Не вдалося отримати центри" retry={refetch} />;
  }

  return (
    <div className="detail-page">
      <section className="detail-card">
        <h1 className="detail-card__title">Спортивні центри мережі</h1>
        <p>
          Оберіть найближчу локацію та дізнайтеся деталі графіку, контактів і доступних залів. Кожен
          центр має свою команду тренерів та набір секцій.
        </p>
      </section>
      <div className="sections-grid">
        {centers.map((center) => (
          <article className="section-card section-card--center" key={center.id}>
            <div className="section-card__header">
              <div>
                <p className="section-card__title">{center.name}</p>
                <div className="section-card__meta">
                  <span className="meta-pill">{center.city}</span>
                </div>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>{center.address}</p>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {center.contact_phone}
                </p>
                {center.opening_hours && (
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)' }}>{center.opening_hours}</p>
                )}
              </div>
            </div>
            {center.description && <p style={{ margin: 0, flex: '1 1 auto' }}>{center.description}</p>}
            <Link
              to={`/centers/${center.id}`}
              className="primary-button"
              style={{ marginTop: 'auto', textAlign: 'center', textDecoration: 'none', display: 'block' }}
            >
              Деталі центру
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
};

export default CentersPage;

