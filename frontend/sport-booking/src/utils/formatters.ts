import dayjs from 'dayjs';
import type { Section } from '../types/catalog';

export const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(Number(amount));

export const formatDate = (value: string) => dayjs(value).format('DD MMM');

export const formatWeekday = (value: string) => dayjs(value).format('ddd');

export const formatTime = (value: string) => dayjs(value).format('HH:mm');

export const formatTimeRange = (start: string, end: string) =>
  `${dayjs(start).format('HH:mm')} – ${dayjs(end).format('HH:mm')}`;

export const getSectionCity = (section: Section) =>
  section.trainers[0]?.center_detail?.city ?? undefined;

