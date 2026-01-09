import { useMemo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQueries } from '@tanstack/react-query';

import { adminList } from '../../api/admin';
import DateField from '../common/DateField';

export type AdminFieldConfig = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'datetime' | 'date';
  required?: boolean;
  options?: Array<{ label: string; value: string | number | boolean }>;
  optionsEndpoint?: string;
  optionLabelKey?: string;
  optionValueKey?: string;
  showIf?: (values: Record<string, any>) => boolean;
};

type AdminDrawerFormProps = {
  fields: AdminFieldConfig[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onClose: () => void;
  title: string;
};

const AdminDrawerForm = ({ fields, initialValues, onSubmit, onClose, title }: AdminDrawerFormProps) => {
  const processedInitialValues = useMemo(() => {
    if (!initialValues) return {};
    const processed: Record<string, any> = { ...initialValues };
    
    fields.forEach((field) => {
      if (field.type === 'date' && processed[field.name]) {
        const dateValue = processed[field.name];
        if (typeof dateValue === 'string') {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            processed[field.name] = date.toISOString().split('T')[0];
          }
        }
      }
      if (field.name === 'target_user' && processed.target_user_email) {
        processed[field.name] = processed.target_user_email;
      }
      if (field.name === 'target_subscription' && processed.target_subscription) {
        processed[field.name] = processed.target_subscription;
      }
    });
    
    return processed;
  }, [initialValues, fields]);
  
  const { register, handleSubmit, reset, control, setValue } = useForm({
    defaultValues: processedInitialValues,
  });
  
  const formValues = useWatch({ control });

  useEffect(() => {
    if (processedInitialValues) {
      Object.keys(processedInitialValues).forEach((key) => {
        setValue(key, processedInitialValues[key]);
      });
    }
  }, [processedInitialValues, setValue]);
  
  const endpointFields = useMemo(
    () => fields.filter((field) => field.optionsEndpoint),
    [fields],
  );

  const optionQueries = useQueries({
    queries: endpointFields.map((field) => ({
      queryKey: ['admin', 'options', field.optionsEndpoint, field.name === 'target_section' ? formValues.target_center : undefined],
      queryFn: () => adminList(field.optionsEndpoint ?? ''),
      enabled: Boolean(field.optionsEndpoint),
    })),
  });


  const allSections = useMemo(() => {
    const sectionsField = endpointFields.find((f) => f.optionsEndpoint === 'sections');
    if (!sectionsField) return [];
    const idx = endpointFields.findIndex((f) => f.name === sectionsField.name);
    const optionQuery = optionQueries[idx];
    const raw = optionQuery?.data;
    return Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
  }, [optionQueries, endpointFields]);

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
    

    let filteredResults = results;
    if (field.optionsEndpoint === 'sections' && field.name === 'target_section') {
      const selectedCenterId = formValues.target_center;
      const selectedAgeCategory = formValues.target_age_category;
      
      filteredResults = results.filter((item: any) => {

        if (selectedCenterId) {
          const itemCenterId = item.hall_detail?.center?.id || item.hall?.center?.id || item.center_id;
          if (itemCenterId != selectedCenterId) {
            return false;
          }
        }
        

        if (selectedAgeCategory) {
          const itemAgeCategory = item.ageCategory || '';

          if (selectedAgeCategory === 'Adults' && !itemAgeCategory.includes('Adults') && !itemAgeCategory.includes('Дорослі')) {
            return false;
          }
          if (selectedAgeCategory === 'Kids' && !itemAgeCategory.includes('Kids') && !itemAgeCategory.includes('Діти')) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    return filteredResults.map((item: any) => {
      let label = field.optionLabelKey ? item[field.optionLabelKey] : item.name ?? item.id;
      

      if (field.optionsEndpoint === 'sections') {
        const level = item.level || '';
        const ageCategory = item.ageCategory || '';
        const parts = [item.sportType || label];
        if (level) parts.push(level);
        if (ageCategory) parts.push(ageCategory);
        label = parts.join(' · ');
      }
      

      if (field.optionsEndpoint === 'centers') {
        const city = item.city || '';
        if (city) {
          label = `${item.name || label} (${city})`;
        }
      }
      
      return {
        label,
        value: field.optionValueKey ? item[field.optionValueKey] : item.id,
      };
    });
  };

  const prepareValues = (values: Record<string, any>) => {
    const payload: Record<string, any> = {};
    fields.forEach((field) => {
      if (field.showIf && !field.showIf(values)) {
        return;
      }
      
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
      } else if (field.type === 'date') {
        if (value) {
          const dateStr = value.includes('T') ? value : `${value}T00:00:00Z`;
          payload[field.name] = dateStr;
        } else {
          payload[field.name] = null;
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
              
              // Перевірка умовного відображення
              if (field.showIf && !field.showIf(formValues)) {
                return null;
              }
              
              return (
                <label key={field.name}>
                  {field.label}
                  {field.type === 'textarea' ? (
                    <textarea {...register(field.name, { required: field.required })} rows={3} />
                  ) : field.type === 'select' ? (
                    <select 
                      {...register(field.name, { required: field.required })}
                      onChange={(e) => {
                        register(field.name).onChange(e);
                        // Якщо обрано секцію, автоматично встановлюємо вікову категорію
                        if (field.name === 'target_section' && e.target.value) {
                          const selectedSection = allSections.find((r: any) => {
                            const value = field.optionValueKey ? r[field.optionValueKey] : r.id;
                            return String(value) === e.target.value;
                          });
                          if (selectedSection) {
                            const ageCategory = selectedSection.ageCategory || '';
                            // Визначаємо вікову категорію
                            let targetAgeCategory = '';
                            if (ageCategory.includes('Adults') || ageCategory.includes('Дорослі')) {
                              targetAgeCategory = 'Adults';
                            } else if (ageCategory.includes('Kids') || ageCategory.includes('Діти')) {
                              targetAgeCategory = 'Kids';
                            }
                            if (targetAgeCategory) {
                              setValue('target_age_category', targetAgeCategory);
                            }
                          }
                        }
                        // Якщо змінюється вікова категорія, очищаємо секцію (якщо вона не відповідає)
                        if (field.name === 'target_age_category') {
                          const currentSection = formValues.target_section;
                          if (currentSection) {
                            const selectedSection = allSections.find((r: any) => {
                              const value = field.optionValueKey ? r[field.optionValueKey] : r.id;
                              return String(value) === String(currentSection);
                            });
                            if (selectedSection) {
                              const sectionAgeCategory = selectedSection.ageCategory || '';
                              const newAgeCategory = e.target.value;
                              // Якщо обрана секція не відповідає новій віковій категорії, очищаємо її
                              if (newAgeCategory === 'Adults' && !sectionAgeCategory.includes('Adults') && !sectionAgeCategory.includes('Дорослі')) {
                                setValue('target_section', '');
                              } else if (newAgeCategory === 'Kids' && !sectionAgeCategory.includes('Kids') && !sectionAgeCategory.includes('Діти')) {
                                setValue('target_section', '');
                              }
                            }
                          }
                        }
                      }}
                    >
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
                  ) : field.type === 'date' ? (
                    <DateField
                      value={formValues[field.name] || null}
                      onChange={(value) => setValue(field.name, value)}
                      allowClear={!field.required}
                    />
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

