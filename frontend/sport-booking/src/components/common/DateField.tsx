import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';

import DatePicker from './DatePicker';

type DateFieldProps = {
  value: string | null;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
};

const DateField = ({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'дд.мм.рррр',
  disabled = false,
  allowClear = false,
}: DateFieldProps) => {
  const [isOpen, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const displayValue = useMemo(() => {
    if (!value) {
      return '';
    }
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD.MM.YYYY') : value;
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const [inputValue, setInputValue] = useState(displayValue);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(displayValue);
    }
  }, [displayValue, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    
    // Try to parse the input as date
    // Support formats: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
    if (inputValue) {
      const formats = ['DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];
      for (const format of formats) {
        const parsed = dayjs(inputValue, format, true);
        if (parsed.isValid()) {
          onChange(parsed.format('YYYY-MM-DD'));
          return;
        }
      }
      // If input is not valid, revert to display value
      setInputValue(displayValue);
    } else {
      // If input is empty and allowClear, clear the value
      if (allowClear) {
        onChange('');
      } else {
        setInputValue(displayValue);
      }
    }
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={`date-field${disabled ? ' is-disabled' : ''}`} ref={wrapperRef}>
      <input
        type="text"
        value={isEditing ? inputValue : displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        onClick={() => {
          if (!disabled && !isEditing) {
            setOpen(true);
          }
        }}
      />
      <button
        type="button"
        className="date-field__button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-label="Обрати дату"
        disabled={disabled}
      >
        📅
      </button>
      {isOpen && !disabled && (
        <div className="date-field__popover">
          <DatePicker
            value={value && dayjs(value).isValid() ? value : null}
            onChange={handleSelect}
            minDate={minDate}
            maxDate={maxDate}
            allowClear={allowClear}
          />
        </div>
      )}
    </div>
  );
};

export default DateField;


