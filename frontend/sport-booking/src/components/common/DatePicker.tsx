import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';

type DatePickerProps = {
  value: string | null;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  allowClear?: boolean;
  className?: string;
};

const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const parsedDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const DatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  allowClear = false,
  className = '',
}: DatePickerProps) => {
  const selectedDate = parsedDate(value);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? dayjs());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const min = parsedDate(minDate ?? null);
  const max = parsedDate(maxDate ?? null);

  const { cells, monthLabel } = useMemo(() => {
    const startOfMonth = visibleMonth.startOf('month');
    const endOfMonth = visibleMonth.endOf('month');
    const startOffset = startOfMonth.day();
    const endOffset = 6 - endOfMonth.day();
    let cursor = startOfMonth.subtract(startOffset, 'day');
    const endCursor = endOfMonth.add(endOffset, 'day');
    const days: dayjs.Dayjs[] = [];
    while (cursor.isBefore(endCursor) || cursor.isSame(endCursor, 'day')) {
      days.push(cursor);
      cursor = cursor.add(1, 'day');
    }
    return {
      cells: days,
      monthLabel: visibleMonth.format('MMMM YYYY'),
    };
  }, [visibleMonth]);

  // Generate years for year picker (current year ± 100 years)
  const years = useMemo(() => {
    const currentYear = dayjs().year();
    const yearsList: number[] = [];
    for (let i = currentYear - 100; i <= currentYear + 10; i++) {
      yearsList.push(i);
    }
    return yearsList;
  }, []);

  // Generate months for month picker
  const months = useMemo(() => {
    return [
      'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
      'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
    ];
  }, []);

  const isDisabled = useCallback(
    (date: dayjs.Dayjs) => {
      if (min && date.isBefore(min, 'day')) {
        return true;
      }
      if (max && date.isAfter(max, 'day')) {
        return true;
      }
      return false;
    },
    [max, min],
  );

  const handleSelect = (date: dayjs.Dayjs) => {
    if (isDisabled(date)) {
      return;
    }
    onChange(date.format('YYYY-MM-DD'));
    setVisibleMonth(date);
  };

  const handleClear = () => {
    onChange('');
  };

  const handleYearSelect = (year: number) => {
    setVisibleMonth(visibleMonth.year(year));
    setShowYearPicker(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setVisibleMonth(visibleMonth.month(monthIndex));
    setShowMonthPicker(false);
  };

  return (
    <div className={`mini-calendar ${className}`.trim()}>
      <div className="mini-calendar__header">
        <button
          type="button"
          className="mini-calendar__nav"
          onClick={() => setVisibleMonth((current) => current.subtract(1, 'month'))}
          aria-label="Попередній місяць"
        >
          ‹
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <button
            type="button"
            className="mini-calendar__month"
            onClick={() => {
              setShowMonthPicker(!showMonthPicker);
              setShowYearPicker(false);
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {visibleMonth.format('MMMM')}
          </button>
          <button
            type="button"
            className="mini-calendar__month"
            onClick={() => {
              setShowYearPicker(!showYearPicker);
              setShowMonthPicker(false);
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {visibleMonth.format('YYYY')}
          </button>
        </div>
        <button
          type="button"
          className="mini-calendar__nav"
          onClick={() => setVisibleMonth((current) => current.add(1, 'month'))}
          aria-label="Наступний місяць"
        >
          ›
        </button>
      </div>
      {showMonthPicker && (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.25rem',
            padding: '0.5rem',
            borderTop: '1px solid var(--stroke)',
            borderBottom: '1px solid var(--stroke)',
            marginBottom: '0.5rem',
          }}
        >
          {months.map((month, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleMonthSelect(index)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--stroke)',
                borderRadius: '4px',
                background: visibleMonth.month() === index ? 'var(--primary)' : 'transparent',
                color: visibleMonth.month() === index ? '#fff' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
              onMouseEnter={(e) => {
                if (visibleMonth.month() !== index) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (visibleMonth.month() !== index) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              {month}
            </button>
          ))}
        </div>
      )}
      {showYearPicker && (
        <div 
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.25rem',
            padding: '0.5rem',
            borderTop: '1px solid var(--stroke)',
            borderBottom: '1px solid var(--stroke)',
            marginBottom: '0.5rem',
          }}
        >
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleYearSelect(year)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--stroke)',
                borderRadius: '4px',
                background: visibleMonth.year() === year ? 'var(--primary)' : 'transparent',
                color: visibleMonth.year() === year ? '#fff' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
              onMouseEnter={(e) => {
                if (visibleMonth.year() !== year) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (visibleMonth.year() !== year) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              {year}
            </button>
          ))}
        </div>
      )}
      <div className="mini-calendar__grid mini-calendar__grid--headings">
        {WEEKDAY_SHORT.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mini-calendar__grid">
        {cells.map((date) => {
          const isCurrentMonth = date.month() === visibleMonth.month();
          const disabled = isDisabled(date);
          const isSelected = selectedDate ? date.isSame(selectedDate, 'day') : false;
          return (
            <button
              type="button"
              key={date.format('YYYY-MM-DD')}
              className={`mini-calendar__day${
                isCurrentMonth ? '' : ' mini-calendar__day--muted'
              }${disabled ? ' is-disabled' : ''}${isSelected ? ' is-selected' : ''}`}
              onClick={() => handleSelect(date)}
              disabled={disabled}
            >
              {date.date()}
            </button>
          );
        })}
      </div>
      {allowClear && value && (
        <button type="button" className="mini-calendar__clear" onClick={handleClear}>
          Очистити
        </button>
      )}
    </div>
  );
};

export default DatePicker;


