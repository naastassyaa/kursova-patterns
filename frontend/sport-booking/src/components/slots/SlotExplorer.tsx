import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import type { ScheduleSlot } from '../../types/catalog';
import { formatCurrency, formatDate, formatTimeRange, formatWeekday } from '../../utils/formatters';

type SlotExplorerProps = {
  slots: ScheduleSlot[];
  onSelectSlot?: (slotId: number) => void;
};

const SlotExplorer = ({ slots, onSelectSlot }: SlotExplorerProps) => {
  const groupedByDay = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>();
    slots.forEach((slot) => {
      const dayKey = slot.start_time.slice(0, 10);
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)?.push(slot);
    });
    return Array.from(map.entries())
      .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .slice(0, 7);
  }, [slots]);

  if (slots.length === 0) {
    return <div className="empty-state">Буде доступно після публікації розкладу.</div>;
  }

  return (
    <section className="slot-explorer">
      <header className="slot-explorer__header">
        <h2 className="slot-explorer__title">Розклад на найближчі дні</h2>
        <p className="slot-explorer__subtitle">
          Оновлений розклад найближчих подій
        </p>
      </header>
      <div className="slot-grid">
        {groupedByDay.map(([dayKey, daySlots]) => (
          <div className="slot-column" key={dayKey}>
            <p className="slot-column__title">
              {formatDate(dayKey)} · {formatWeekday(dayKey)}
            </p>
            {daySlots.map((slot) => {
              const availabilityClass = slot.available_spots > 5 ? 'good' : 'low';
              return (
                <div className="slot-card" key={slot.id}>
                  <p className="slot-card__title">{slot.section.sportType}</p>
                  <p className="slot-card__time">{formatTimeRange(slot.start_time, slot.end_time)}</p>
                  <div className="badges-row">
                    <span className={`availability-pill ${availabilityClass}`}>
                      {slot.available_spots} місць
                    </span>
                    <span className="badge">{slot.hall.center.city}</span>
                    <span className="badge">{formatCurrency(slot.price)}</span>
                  </div>
                  {onSelectSlot && (
                    <button
                      type="button"
                      className="primary-button"
                      style={{ width: '100%', marginTop: '0.5rem' }}
                      disabled={slot.available_spots <= 0}
                      onClick={() => onSelectSlot(slot.id)}
                    >
                      {slot.available_spots <= 0 ? 'Немає місць' : 'Забронювати слот'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

export default SlotExplorer;

