import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQueries } from '@tanstack/react-query';

import { adminList } from '../../api/admin';

export type AdminFieldConfig = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'datetime';
  required?: boolean;
  options?: Array<{ label: string; value: string | number | boolean }>;
  optionsEndpoint?: string;
  optionLabelKey?: string;
  optionValueKey?: string;
};

type AdminDrawerFormProps = {
  fields: AdminFieldConfig[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onClose: () => void;
  title: string;
};

const AdminDrawerForm = ({ fields, initialValues, onSubmit, onClose, title }: AdminDrawerFormProps) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: initialValues ?? {},
  });

  const endpointFields = useMemo(
    () => fields.filter((field) => field.optionsEndpoint),
    [fields],
  );

  const optionQueries = useQueries({
    queries: endpointFields.map((field) => ({
      queryKey: ['admin', 'options', field.optionsEndpoint],
      queryFn: () => adminList(field.optionsEndpoint ?? ''),
      enabled: Boolean(field.optionsEndpoint),
    })),
  });

  const getOptions = (field: AdminFieldConfig) => {
    if (field.options) {
      return field.options;
    }
    const idx = endpointFields.findIndex((f) => f.name === field.name);
    const optionQuery = optionQueries[idx];
    const raw = optionQuery?.data;
    const results = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
    if (!results) {
      return [];
    }
    return results.map((item: any) => ({
      label: field.optionLabelKey ? item[field.optionLabelKey] : item.name ?? item.id,
      value: field.optionValueKey ? item[field.optionValueKey] : item.id,
    }));
  };

  const prepareValues = (values: Record<string, any>) => {
    const payload: Record<string, any> = {};
    fields.forEach((field) => {
      const value = values[field.name];
      if (value === undefined || value === null || value === '') {
        return;
      }
      if (field.type === 'number') {
        payload[field.name] = Number(value);
      } else if (field.type === 'multiselect') {
        if (Array.isArray(value)) {
          payload[field.name] = value;
        } else if (typeof value === 'string') {
          payload[field.name] = value ? value.split(',') : [];
        } else if (value && value.length) {
          payload[field.name] = Array.from(value);
        }
      } else if (field.type === 'select') {
        if (value === 'true') {
          payload[field.name] = true;
        } else if (value === 'false') {
          payload[field.name] = false;
        } else {
          const maybeNumber = Number(value);
          payload[field.name] = Number.isNaN(maybeNumber) ? value : maybeNumber;
        }
      } else {
        payload[field.name] = value;
      }
    });
    return payload;
  };

  const submitHandler = (values: Record<string, any>) => {
    onSubmit(prepareValues(values));
    reset();
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="booking-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="ghost-button close-button"
            onClick={onClose}
            aria-label="Закрити"
          >
            &times;
          </button>
        </header>
        <div className="drawer-body">
          <form className="admin-form" onSubmit={handleSubmit(submitHandler)}>
            {fields.map((field) => {
              const options = getOptions(field);
              return (
                <label key={field.name}>
                  {field.label}
                  {field.type === 'textarea' ? (
                    <textarea {...register(field.name, { required: field.required })} rows={3} />
                  ) : field.type === 'select' ? (
                    <select {...register(field.name, { required: field.required })}>
                      <option value="">—</option>
                      {options.map((option: { label: string; value: string | number | boolean }) => (
                        <option key={String(option.value)} value={String(option.value)}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'multiselect' ? (
                    <select
                      {...register(field.name, { required: field.required })}
                      multiple
                      size={4}
                    >
                      {options.map((option: { label: string; value: string | number | boolean }) => (
                        <option key={String(option.value)} value={String(option.value)}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'datetime' ? 'datetime-local' : 'text'}
                      {...register(field.name, { required: field.required })}
                    />
                  )}
                </label>
              );
            })}
            <button type="submit" className="primary-button primary-button--save">
              Зберегти
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminDrawerForm;

