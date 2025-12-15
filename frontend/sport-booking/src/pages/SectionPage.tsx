import { useMemo, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchScheduleSlots, fetchSectionById } from '../api/catalog';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import SlotExplorer from '../components/slots/SlotExplorer';
import BookingDrawer from '../components/bookings/BookingDrawer';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const SectionPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);

  const {
    data: section,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['section', sectionId],
    queryFn: () => fetchSectionById(sectionId ?? ''),
    enabled: Boolean(sectionId),
  });

  const {
    data: slots,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['section-slots', section?.sportType],
    queryFn: () => fetchScheduleSlots({ sportType: section?.sportType }),
    enabled: Boolean(section?.sportType),
  });

  const sectionSlots = useMemo(
    () => slots?.filter((slot) => slot.section.id === section?.id) ?? [],
    [slots, section?.id],
  );

  const handleSlotSelect = (slotId: number) => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    setActiveSlotId(slotId);
  };

  if (isError) {
    return <ErrorState message="Не вдалося знайти секцію" retry={refetch} />;
  }

  if (!section || isLoading) {
    return <LoadingState message="Завантаження секції..." />;
  }

  return (
    <div className="detail-page">
      <section className="detail-card detail-card--hero">
        <h1 className="detail-card__title">{section.sportType}</h1>
        <div className="detail-meta">
          {section.center_city && <span>Локація: {section.center_city}</span>}
          {section.center_name && <span>Центр: {section.center_name}</span>}
          <span>Хол: {section.hall_name}</span>
          <span>Вартість: {formatCurrency(section.base_price)}</span>
        </div>
        {section.description && <p className="detail-card__description">{section.description}</p>}
      </section>

      <section className="detail-card">
        <h2>Тренери</h2>
        {section.trainers.length === 0 ? (
          <p>Немає доданих тренерів.</p>
        ) : (
          <ul>
            {section.trainers.map((trainer) => (
              <li key={trainer.id}>
                <Link to={`/trainers/${trainer.id}`}>
                  {trainer.first_name} {trainer.last_name}
                </Link>{' '}
                · {trainer.specialization} · {trainer.experience_years} років досвіду
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="detail-card">
        <h2>Найближчі слоти</h2>
        {!isAuthenticated && (
          <div className="info-banner">
            <p>Увійдіть або зареєструйтесь, щоб забронювати місце у секції.</p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate('/auth/login', { state: { from: location } })}
            >
              Увійти
            </button>
          </div>
        )}
        {slotsLoading ? (
          <LoadingState message="Завантаження розкладу..." />
        ) : sectionSlots.length === 0 ? (
          <ErrorState message="Ще немає відкритих слотів" retry={refetchSlots} />
        ) : (
          <SlotExplorer slots={sectionSlots} onSelectSlot={isAuthenticated ? handleSlotSelect : undefined} />
        )}
      </section>
      {activeSlotId !== null && (
        <BookingDrawer slotId={activeSlotId} onClose={() => setActiveSlotId(null)} />
      )}
    </div>
  );
};

export default SectionPage;

