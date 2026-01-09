import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import AdminTable from '../components/admin/AdminTable';
import AdminDrawerForm, { AdminFieldConfig } from '../components/admin/AdminDrawerForm';
import { adminCreate, adminDelete, adminList, adminUpdate } from '../api/admin';
import { parseApiError } from '../utils/apiErrors';

type AdminResourceConfig = {
  key: string;
  title: string;
  endpoint: string;
  description?: string;
  columns: Array<{ key: string; label: string; render?: (row: any) => React.ReactNode }>;
  fields: AdminFieldConfig[];
};

const resources: AdminResourceConfig[] = [
  {
    key: 'centers',
    title: 'Центри',
    endpoint: 'centers',
    columns: [
      { key: 'name', label: 'Назва' },
      { key: 'city', label: 'Місто' },
      { key: 'address', label: 'Адреса' },
    ],
    fields: [
      { name: 'name', label: 'Назва', type: 'text', required: true },
      { name: 'city', label: 'Місто', type: 'text', required: true },
      { name: 'address', label: 'Адреса', type: 'text', required: true },
      { name: 'contact_phone', label: 'Телефон', type: 'text' },
      { name: 'description', label: 'Опис', type: 'textarea' },
      { name: 'opening_hours', label: 'Графік', type: 'text' },
    ],
  },
  {
    key: 'halls',
    title: 'Зали',
    endpoint: 'halls',
    columns: [
      { key: 'name', label: 'Назва' },
      {
        key: 'center',
        label: 'Центр',
        render: (row) => row.center?.name ?? row.center_name ?? '—',
      },
      { key: 'type', label: 'Тип' },
      { key: 'capacity', label: 'Місткість' },
    ],
    fields: [
      { name: 'name', label: 'Назва', type: 'text', required: true },
      {
        name: 'center',
        label: 'Центр',
        type: 'select',
        required: true,
        optionsEndpoint: 'centers',
        optionLabelKey: 'name',
        optionValueKey: 'id',
      },
      { name: 'type', label: 'Тип', type: 'text' },
      { name: 'capacity', label: 'Місткість', type: 'number' },
      { name: 'equipment', label: 'Обладнання', type: 'textarea' },
    ],
  },
  {
    key: 'trainers',
    title: 'Тренери',
    endpoint: 'trainers',
    columns: [
      { key: 'first_name', label: 'Імʼя' },
      { key: 'last_name', label: 'Прізвище' },
      { key: 'specialization', label: 'Спеціалізація' },
      {
        key: 'center',
        label: 'Центр',
        render: (row) => row.center_detail?.name ?? row.center?.name ?? '—',
      },
    ],
    fields: [
      { name: 'first_name', label: 'Імʼя', type: 'text', required: true },
      { name: 'last_name', label: 'Прізвище', type: 'text', required: true },
      { name: 'specialization', label: 'Спеціалізація', type: 'text' },
      { name: 'experience_years', label: 'Досвід (роки)', type: 'number' },
      {
        name: 'center',
        label: 'Центр',
        type: 'select',
        required: true,
        optionsEndpoint: 'centers',
        optionLabelKey: 'name',
        optionValueKey: 'id',
      },
      { name: 'biography', label: 'Біо', type: 'textarea' },
    ],
  },
  {
    key: 'sections',
    title: 'Секції',
    endpoint: 'sections',
    columns: [
      { key: 'sportType', label: 'Спорт' },
      { key: 'level', label: 'Рівень' },
      {
        key: 'hall',
        label: 'Зал',
        render: (row) => row.hall_detail?.name ?? row.hall?.name ?? row.hall_name ?? '—',
      },
      {
        key: 'center',
        label: 'Центр',
        render: (row) => row.hall_detail?.center?.name ?? row.hall?.center?.name ?? row.hall?.center_name ?? '—',
      },
      { key: 'capacity', label: 'Місткість' },
    ],
    fields: [
      { name: 'sportType', label: 'Спорт', type: 'text', required: true },
      { name: 'level', label: 'Рівень', type: 'text', required: true },
      { name: 'ageCategory', label: 'Вікова категорія', type: 'text' },
      { name: 'capacity', label: 'Місткість', type: 'number' },
      {
        name: 'hall',
        label: 'Зал',
        type: 'select',
        required: true,
        optionsEndpoint: 'halls',
        optionLabelKey: 'name',
        optionValueKey: 'id',
      },
      {
        name: 'trainer_ids',
        label: 'Тренери',
        type: 'multiselect',
        optionsEndpoint: 'trainers',
        optionLabelKey: 'first_name',
        optionValueKey: 'id',
      },
      { name: 'base_price', label: 'Базова ціна', type: 'number' },
      { name: 'description', label: 'Опис', type: 'textarea' },
    ],
  },
  {
    key: 'schedules',
    title: 'Розклади',
    endpoint: 'schedules',
    columns: [
      {
        key: 'section',
        label: 'Секція',
        render: (row) => row.section?.sportType ?? '—',
      },
      {
        key: 'hall',
        label: 'Зал',
        render: (row) => row.hall?.name ?? row.hall_detail?.name ?? '—',
      },
      {
        key: 'center',
        label: 'Центр',
        render: (row) => row.hall?.center?.name ?? row.hall_detail?.center?.name ?? '—',
      },
      {
        key: 'start_time',
        label: 'Початок',
        render: (row) => {
          if (!row.start_time) return '—';
          const date = new Date(row.start_time);
          const weekday = date.toLocaleDateString('uk-UA', { weekday: 'long' });
          const time = date.toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit',
          });
          return `${weekday}, ${time}`;
        },
      },
      { key: 'capacity', label: 'Місткість' },
      { key: 'available_spots', label: 'Вільно' },
    ],
    fields: [
      {
        name: 'section_id',
        label: 'Секція',
        type: 'select',
        required: true,
        optionsEndpoint: 'sections',
        optionLabelKey: 'sportType',
        optionValueKey: 'id',
      },
      {
        name: 'hall_id',
        label: 'Зал',
        type: 'select',
        required: true,
        optionsEndpoint: 'halls',
        optionLabelKey: 'name',
        optionValueKey: 'id',
      },
      {
        name: 'trainer_id',
        label: 'Тренер',
        type: 'select',
        optionsEndpoint: 'trainers',
        optionLabelKey: 'first_name',
        optionValueKey: 'id',
      },
      { name: 'start_time', label: 'Старт', type: 'datetime', required: true },
      { name: 'end_time', label: 'Завершення', type: 'datetime', required: true },
      { name: 'capacity', label: 'Місткість', type: 'number', required: true },
    ],
  },
  {
    key: 'subscriptions',
    title: 'Плани',
    endpoint: 'subscriptions',
    columns: [
      { key: 'type', label: 'Тип' },
      { key: 'price', label: 'Ціна' },
      { key: 'duration', label: 'Тривалість' },
    ],
    fields: [
      { name: 'type', label: 'Тип', type: 'text', required: true },
      { name: 'price', label: 'Ціна', type: 'number', required: true },
      { name: 'duration', label: 'Дні', type: 'number', required: true },
      { name: 'description', label: 'Опис', type: 'textarea' },
    ],
  },
  {
    key: 'memberships',
    title: 'Абонементи користувачів',
    endpoint: 'memberships',
    columns: [
      { key: 'user', label: 'Користувач' },
      {
        key: 'subscription',
        label: 'План',
        render: (row) => row.subscription_detail?.type ?? row.subscription ?? '—',
      },
      { key: 'status', label: 'Статус' },
    ],
    fields: [
      { name: 'user_id', label: 'ID користувача', type: 'number', required: true },
      {
        name: 'subscription',
        label: 'План',
        type: 'select',
        required: true,
        optionsEndpoint: 'subscriptions',
        optionLabelKey: 'type',
        optionValueKey: 'id',
      },
      { name: 'start_date', label: 'Старт', type: 'datetime' },
      { name: 'end_date', label: 'Кінець', type: 'datetime' },
      { name: 'status', label: 'Статус', type: 'text' },
      {
        name: 'auto_renew',
        label: 'Автопродовження',
        type: 'select',
        options: [
          { label: 'Так', value: true },
          { label: 'Ні', value: false },
        ],
      },
    ],
  },
  {
    key: 'promotions',
    title: 'Акції',
    endpoint: 'promotions',
    columns: [
      { key: 'title', label: 'Заголовок' },
      {
        key: 'scope',
        label: 'Тип',
        render: (row) => (row.scope === 'GENERAL' ? 'Загальна' : 'Персональна'),
      },
      {
        key: 'discount_type',
        label: 'Тип знижки',
        render: (row) => {
          const types: Record<string, string> = {
            SUBSCRIPTION: 'На абонемент',
            INFO: 'Інформаційна',
          };
          return types[row.discount_type] || row.discount_type;
        },
      },
      {
        key: 'discount_value',
        label: 'Знижка',
        render: (row) => {
          if (!row.discount_value) return '—';
          const valueType = row.discount_value_type === 'PERCENTAGE' ? '%' : 'грн';
          return `${row.discount_value} ${valueType}`;
        },
      },
      {
        key: 'start_date',
        label: 'Початок',
        render: (row) => {
          const date = new Date(row.start_date);
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          const day = date.getUTCDate();
          const localDate = new Date(year, month, day);
          return localDate.toLocaleDateString('uk-UA');
        },
      },
      {
        key: 'end_date',
        label: 'Кінець',
        render: (row) => {
          const date = new Date(row.end_date);
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          const day = date.getUTCDate();
          const localDate = new Date(year, month, day);
          return localDate.toLocaleDateString('uk-UA');
        },
      },
      {
        key: 'target_center_name',
        label: 'Центр',
        render: (row) => row.target_center_name ?? '—',
      },
      {
        key: 'target_age_category',
        label: 'Вікова категорія',
        render: (row) => {
          if (!row.target_age_category) return 'Всі';
          const categories: Record<string, string> = {
            'Adults': 'Дорослі',
            'Kids': 'Діти',
          };
          return categories[row.target_age_category] || row.target_age_category;
        },
      },
      {
        key: 'target_subscription_type',
        label: 'Цільовий абонемент',
        render: (row) => {
          if (row.discount_type !== 'SUBSCRIPTION') return '—';
          return row.target_subscription_type ?? 'Всі';
        },
      },
      {
        key: 'is_valid',
        label: 'Дійсна',
        render: (row) => (row.is_valid ? 'Так' : 'Ні'),
      },
    ],
    fields: [
      { name: 'title', label: 'Заголовок', type: 'text', required: true },
      { name: 'description', label: 'Опис', type: 'textarea', required: true },
      {
        name: 'scope',
        label: 'Тип акції',
        type: 'select',
        required: true,
        options: [
          { label: 'Загальна', value: 'GENERAL' },
          { label: 'Персональна', value: 'PERSONAL' },
        ],
      },
      {
        name: 'discount_type',
        label: 'Тип знижки',
        type: 'select',
        required: true,
        options: [
          { label: 'На абонемент', value: 'SUBSCRIPTION' },
          { label: 'Інформаційна', value: 'INFO' },
        ],
      },
      {
        name: 'discount_value_type',
        label: 'Тип значення знижки',
        type: 'select',
        options: [
          { label: 'Відсоток', value: 'PERCENTAGE' },
          { label: 'Фіксована сума', value: 'FIXED' },
        ],
      },
      { name: 'discount_value', label: 'Значення знижки', type: 'number' },
      { name: 'start_date', label: 'Дата початку', type: 'date', required: true },
      { name: 'end_date', label: 'Дата закінчення', type: 'date', required: true },
      {
        name: 'target_user',
        label: 'Email користувача',
        type: 'text',
        showIf: (values) => values.scope === 'PERSONAL',
      },
      {
        name: 'target_subscription',
        label: 'Цільовий абонемент',
        type: 'select',
        optionsEndpoint: 'subscriptions',
        optionLabelKey: 'type',
        optionValueKey: 'id',
        showIf: (values) => values.discount_type === 'SUBSCRIPTION',
      },
      {
        name: 'target_section',
        label: 'Цільова секція (опціонально)',
        type: 'select',
        optionsEndpoint: 'sections',
        optionLabelKey: 'sportType',
        optionValueKey: 'id',
        showIf: (values) => values.discount_type === 'BOOKING' && values.target_center,
      },
      {
        name: 'target_age_category',
        label: 'Вікова категорія',
        type: 'select',
        options: [
          { label: 'Всі', value: '' },
          { label: 'Дорослі', value: 'Adults' },
          { label: 'Діти', value: 'Kids' },
        ],
        showIf: () => false,
      },
    ],
  },
];

const AdminWorkspacePage = () => {
  const [activeResourceKey, setActiveResourceKey] = useState(resources[0].key);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const activeResource = useMemo(
    () => resources.find((resource) => resource.key === activeResourceKey) ?? resources[0],
    [activeResourceKey],
  );

  const listQuery = useQuery({
    queryKey: ['admin', activeResource.key, search, page],
    queryFn: () =>
      adminList(activeResource.endpoint, {
        search: search || undefined,
        page,
      }),
    enabled: true,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Refetch when active resource changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', activeResource.key] });
    queryClient.refetchQueries({ queryKey: ['admin', activeResource.key] });
  }, [activeResource.key, queryClient]);

  const records = Array.isArray(listQuery.data?.results)
    ? listQuery.data?.results
    : Array.isArray(listQuery.data)
      ? listQuery.data
      : [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => adminCreate(activeResource.endpoint, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', activeResource.key] });
      queryClient.refetchQueries({ queryKey: ['admin', activeResource.key] });
      setDrawerOpen(false);
      setEditingRow(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      adminUpdate(activeResource.endpoint, editingRow.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', activeResource.key] });
      setDrawerOpen(false);
      setEditingRow(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (row: any) => adminDelete(activeResource.endpoint, row.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', activeResource.key] });
    },
  });

  const submitForm = (values: Record<string, any>) => {
    if (editingRow) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h3>Адмін панель</h3>
        <nav>
          {resources.map((resource) => (
            <button
              key={resource.key}
              type="button"
              className={resource.key === activeResourceKey ? 'active' : ''}
              onClick={() => {
                setActiveResourceKey(resource.key);
                setPage(1);
                setSearch('');
              }}
            >
              {resource.title}
            </button>
          ))}
        </nav>
      </aside>
      <main className="admin-content">
        <div className="admin-toolbar">
          <div>
            <h1>{activeResource.title}</h1>
            {activeResource.description && <p>{activeResource.description}</p>}
          </div>
          <div className="admin-toolbar__actions">
            <input
              type="search"
              placeholder="Пошук..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="button" className="primary-button" onClick={() => setDrawerOpen(true)}>
              Додати
            </button>
          </div>
        </div>
        {listQuery.isLoading ? (
          <p>Завантаження...</p>
        ) : listQuery.isError ? (
          <p>{parseApiError(listQuery.error)}</p>
        ) : (
          <>
            <AdminTable
              data={records}
              columns={activeResource.columns}
              onEdit={(row) => {
                setEditingRow(row);
                setDrawerOpen(true);
              }}
              onDelete={(row) => deleteMutation.mutate(row)}
            />
            <div className="admin-pagination">
              <button
                type="button"
                className="ghost-button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                ← Назад
              </button>
              <span>Сторінка {page}</span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPage((prev) => prev + 1)}
              >
                Далі →
              </button>
            </div>
          </>
        )}
      </main>
      {drawerOpen && (
        <AdminDrawerForm
          title={
            editingRow ? `Редагувати ${activeResource.title}` : `Створити ${activeResource.title}`
          }
          fields={activeResource.fields}
          initialValues={editingRow ?? undefined}
          onSubmit={submitForm}
          onClose={() => {
            setDrawerOpen(false);
            setEditingRow(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminWorkspacePage;

