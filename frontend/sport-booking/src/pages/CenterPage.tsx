import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/uk';
import isoWeek from 'dayjs/plugin/isoWeek';

import { fetchHalls, fetchSections, fetchScheduleSlots } from '../api/catalog';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { formatCurrency, formatTime } from '../utils/formatters';
import type { ScheduleSlot } from '../types/catalog';

dayjs.extend(isoWeek);
dayjs.locale('uk');

const CenterPage = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const numericId = Number(centerId);
  const [displayCount, setDisplayCount] = useState(10);

  const {
    data: halls,
    isLoading: hallsLoading,
    isError: hallsError,
    refetch: refetchHalls,
  } = useQuery({
    queryKey: ['halls'],
    queryFn: fetchHalls,
  });

  const {
    data: sections,
    isLoading: sectionsLoading,
    isError: sectionsError,
    refetch: refetchSections,
  } = useQuery({
    queryKey: ['sections', 'center-detail'],
    queryFn: () => fetchSections({}),
  });

  const {
    data: allSlots,
    isLoading: slotsLoading,
  } = useQuery({
    queryKey: ['schedule-slots', 'center', numericId],
    queryFn: () => fetchScheduleSlots({}),
  });

  const centerInfo = useMemo(() => {
    if (!halls) return null;
    return halls.find((hall) => hall.center.id === numericId)?.center ?? null;
  }, [halls, numericId]);

  const centerHalls = useMemo(() => {
    if (!halls) return [];
    return halls.filter((hall) => hall.center.id === numericId);
  }, [halls, numericId]);

  const centerSections = useMemo(() => {
    if (!sections) return [];
    const hallNames = centerHalls.map((hall) => hall.name);
    return sections.filter((section) => hallNames.includes(section.hall_name));
  }, [sections, centerHalls]);

  // Розклад на тиждень для цього центру (групування за днем тижня)
  const weekSchedule = useMemo(() => {
    if (!allSlots || !centerInfo) return new Map();

    // Створюємо мапу для кожного дня тижня (0 = неділя, 1 = понеділок, ..., 6 = субота)
    const scheduleByDayOfWeek = new Map<number, ScheduleSlot[]>();
    
    // Ініціалізуємо всі дні тижня (від понеділка до неділі)
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Понеділок, вівторок, ..., неділя
    dayOrder.forEach((dayOfWeek) => {
      scheduleByDayOfWeek.set(dayOfWeek, []);
    });

    // Фільтруємо слоти для цього центру та групуємо за днем тижня
    allSlots.forEach((slot) => {
      const slotCenterId = slot.hall.center.id;
      
      if (slotCenterId === numericId) {
        const slotDate = dayjs(slot.start_time);
        const dayOfWeek = slotDate.day(); // 0 = неділя, 1 = понеділок, ..., 6 = субота
        
        const daySlots = scheduleByDayOfWeek.get(dayOfWeek) || [];
        daySlots.push(slot);
        scheduleByDayOfWeek.set(dayOfWeek, daySlots);
      }
    });

    // Сортуємо слоти за часом для кожного дня
    scheduleByDayOfWeek.forEach((slots) => {
      slots.sort((a, b) => {
        const timeA = dayjs(a.start_time);
        const timeB = dayjs(b.start_time);
        return timeA.diff(timeB);
      });
    });

    return scheduleByDayOfWeek;
  }, [allSlots, centerInfo, numericId]);

  // Reset display count when sections change
  useEffect(() => {
    setDisplayCount(10);
  }, [centerSections.length]);

  if (hallsError || sectionsError) {
    return (
      <ErrorState
        message="Не вдалося завантажити дані центру"
        retry={() => {
          refetchHalls();
          refetchSections();
        }}
      />
    );
  }

  if (hallsLoading || sectionsLoading || !centerInfo) {
    return <LoadingState message="Завантаження центру..." />;
  }

  return (
    <div className="detail-page">
      <section className="detail-card detail-card--hero">
        <h1 className="detail-card__title">{centerInfo.name}</h1>
        <div className="detail-meta">
          <span>{centerInfo.city}</span>
          <span>{centerInfo.address}</span>
          <span>{centerInfo.contact_phone}</span>
          {centerInfo.opening_hours && <span>{centerInfo.opening_hours}</span>}
        </div>
        {centerInfo.description && <p>{centerInfo.description}</p>}
      </section>

      {/* Розклад на тиждень */}
      <section className="detail-card">
        <h2>Розклад на тиждень</h2>
        {slotsLoading ? (
          <LoadingState message="Завантаження розкладу..." />
        ) : Array.from(weekSchedule.values()).every((slots) => slots.length === 0) ? (
          <p style={{ color: 'var(--text-muted)' }}>Поки що немає запланованих занять.</p>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {/* Перший ряд: Понеділок-Середа */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {[1, 2, 3].map((dayOfWeek) => {
                const daySlots = weekSchedule.get(dayOfWeek) || [];
                const dayName = dayjs().day(dayOfWeek).format('dddd');
                
                return (
                  <div
                    key={dayOfWeek}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                        {dayName}
                      </strong>
                    </div>
                    {daySlots.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Немає занять</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                        {daySlots.map((slot: ScheduleSlot) => (
                          <div
                            key={slot.id}
                            style={{
                              padding: '0.4rem 0.5rem',
                              fontSize: '0.8rem',
                              backgroundColor: 'var(--bg-primary)',
                              borderRadius: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <strong style={{ fontSize: '0.85rem', flexShrink: 0 }}>
                              {slot.section.sportType}
                            </strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {slot.hall.name}
                            </span>
                            <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}>
                              {formatTime(slot.start_time)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Другий ряд: Четвер-Субота */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {[4, 5].map((dayOfWeek) => {
                const daySlots = weekSchedule.get(dayOfWeek) || [];
                const dayName = dayjs().day(dayOfWeek).format('dddd');
                
                return (
                  <div
                    key={dayOfWeek}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                        {dayName}
                      </strong>
                    </div>
                    {daySlots.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Немає занять</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                        {daySlots.map((slot: ScheduleSlot) => (
                          <div
                            key={slot.id}
                            style={{
                              padding: '0.4rem 0.5rem',
                              fontSize: '0.8rem',
                              backgroundColor: 'var(--bg-primary)',
                              borderRadius: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <strong style={{ fontSize: '0.85rem', flexShrink: 0 }}>
                              {slot.section.sportType}
                            </strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {slot.hall.name}
                            </span>
                            <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}>
                              {formatTime(slot.start_time)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Неділя */}
            {(() => {
              const daySlots = weekSchedule.get(0) || [];
              const dayName = dayjs().day(0).format('dddd');
              
              if (daySlots.length === 0) return null;
              
              return (
                <div
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    maxWidth: '400px',
                  }}
                >
                  <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                      {dayName}
                    </strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {daySlots.map((slot: ScheduleSlot) => (
                      <div
                        key={slot.id}
                        style={{
                          padding: '0.5rem',
                          fontSize: '0.8rem',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: '0.25rem',
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                          {slot.section.sportType}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                          {slot.hall.name}
                        </span>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
                          {formatTime(slot.start_time)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>

      {/* Секції з пагінацією */}
      <section className="detail-card">
        <h2>Секції центру</h2>
        {centerSections.length === 0 ? (
          <p>Секції ще не додані.</p>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Доступні секції та програми в цьому центрі
            </p>
            <div className="sections-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {centerSections.slice(0, displayCount).map((section) => (
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
            {centerSections.length > displayCount && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setDisplayCount((prev) => prev + 10)}
                >
                  Завантажити ще
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default CenterPage;

