import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { fetchHalls, fetchSections } from '../api/catalog';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { formatCurrency } from '../utils/formatters';

const HomePage = () => {
  // Завантажуємо тільки обмежену кількість для відображення, не всі дані
  const sectionsQuery = useQuery({
    queryKey: ['sections', 'home'],
    queryFn: () => fetchSections({}),
    select: (data) => data.slice(0, 6), // Обмежуємо до 6 для відображення
  });

  const hallsQuery = useQuery({
    queryKey: ['halls', 'home'],
    queryFn: fetchHalls,
    select: (data) => {
      // Беремо тільки унікальні центри для відображення (максимум 6)
      const uniqueCenterIds = Array.from(new Set(data.map((hall) => hall.center.id))).slice(0, 6);
      const uniqueHalls = uniqueCenterIds
        .map((centerId) => data.find((hall) => hall.center.id === centerId))
        .filter((hall): hall is NonNullable<typeof hall> => hall !== undefined);
      return uniqueHalls;
    },
  });

  // Не завантажуємо всі слоти - використовуємо приблизні значення
  const stats = [
    { label: 'Секцій у каталозі', value: '50+' },
    { label: 'Центри по всій країні', value: '7' },
    { label: 'Слоти на найближчі 7 днів', value: '1000+' },
  ];

  if (sectionsQuery.isError || hallsQuery.isError) {
    return <ErrorState message="Не вдалося завантажити дані" />;
  }

  if (!sectionsQuery.data || !hallsQuery.data) {
    return <LoadingState message="Завантаження..." />;
  }

  return (
    <div>
      <section className="hero">
        <div>
          <p className="stat-card__label">Sport Booking Platform</p>
          <h1 style={{ margin: '0.35rem 0' }}>Каталог залів, тренерів та слотів у реальному часі</h1>
          <p className="hero__subtitle">
            Оберіть локацію, знайдіть свою секцію та забронюйте заняття онлайн.
          </p>
        </div>
        <div className="stats-bar">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span className="stat-card__label">{stat.label}</span>
              <span className="stat-card__value">{stat.value}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-card">
        <h2>Як це працює</h2>
        <div className="how-it-works">
          <article>
            <h3>Оберіть локацію</h3>
            <p>Перегляньте доступні центри та знайдіть зал поруч.</p>
          </article>
          <article>
            <h3>Налаштуйте секцію</h3>
            <p>На сторінці "Секції" використайте фільтри за видом спорту та рівнем.</p>
          </article>
          <article>
            <h3>Забронюйте</h3>
            <p>Оплачуйте онлайн та керуйте бонусами у своєму кабінеті.</p>
          </article>
        </div>
      </section>

      {sectionsQuery.data && sectionsQuery.data.length > 0 && (
        <section className="detail-card">
          <h2>Популярні секції</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Ось кілька популярних секцій, які можуть вас зацікавити
          </p>
          <div className="sections-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {sectionsQuery.data.map((section) => (
              <article key={section.id} className="section-card">
                <div className="section-card__header">
                  <div>
                    <p className="section-card__title">{section.sportType}</p>
                    <div className="section-card__meta">
                      <span className="meta-pill">{section.level}</span>
                      <span className="meta-pill">{section.ageCategory}</span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {section.hall_name}
                    </p>
                  </div>
                  <span className="price-badge">{formatCurrency(section.base_price)}</span>
                </div>
                {section.description && (
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', flex: '1 1 auto' }}>
                    {section.description.length > 100 ? `${section.description.substring(0, 100)}...` : section.description}
                  </p>
                )}
                <Link
                  to={`/sections/${section.id}`}
                  className="primary-button"
                  style={{ marginTop: 'auto', textAlign: 'center', textDecoration: 'none', display: 'block' }}
                >
                  Деталі
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {hallsQuery.data && (
        <section className="detail-card">
          <h2>Наші локації</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Ми працюємо у 5+ містах з 10+ спортивними центрами
          </p>
          <div className="sections-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {hallsQuery.data.map((hall) => {
                if (!hall) return null;
                const center = hall.center;
                if (!center) return null;
                return (
                  <article key={center.id} className="section-card">
                    <div className="section-card__header">
                      <div>
                        <p className="section-card__title">{center.name}</p>
                        <div className="section-card__meta">
                          <span className="meta-pill">{center.city}</span>
                        </div>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          {center.address}
                        </p>
                        {center.contact_phone && (
                          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {center.contact_phone}
                          </p>
                        )}
                      </div>
                    </div>
                    {center.description && (
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', flex: '1 1 auto' }}>
                        {center.description.length > 100 ? `${center.description.substring(0, 100)}...` : center.description}
                      </p>
                    )}
                    <Link
                      to={`/centers/${center.id}`}
                      className="primary-button"
                      style={{ marginTop: 'auto', textAlign: 'center', textDecoration: 'none', display: 'block' }}
                    >
                      Деталі центру
                    </Link>
                  </article>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;

