import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type OptionValue = string | number;

type CustomSelectOption = {
  value: OptionValue;
  label: ReactNode;
};

type CustomSelectProps = {
  value: OptionValue | null;
  onChange: (value: OptionValue) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Оберіть значення',
  disabled = false,
}: CustomSelectProps) => {
  const [isOpen, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const handleOptionSelect = (optionValue: OptionValue) => {
    // If clicking on already selected option, clear the selection
    if (value === optionValue && value !== '' && value !== null) {
      onChange('');
    } else {
      // Otherwise, select the new option
      onChange(optionValue);
    }
    // Close dropdown after a small delay to ensure the click event is processed
    setTimeout(() => setOpen(false), 0);
  };

  const handleControlClick = () => {
    setOpen((prev) => !prev);
  };

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

  return (
    <div className={`custom-select${isOpen ? ' open' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="custom-select__control"
        onClick={handleControlClick}
        disabled={disabled}
      >
        <span className="custom-select__value">
          {selectedOption?.label ?? (
            <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{placeholder}</span>
          )}
        </span>
        <span className="custom-select__chevron" aria-hidden="true" />
      </button>
      {isOpen && !disabled && (
        <ul className="custom-select__list" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  className={isSelected ? 'is-selected' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOptionSelect(option.value);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;


