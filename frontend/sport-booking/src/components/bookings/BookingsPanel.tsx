import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { cancelBooking, fetchMyBookings } from '../../api/customer';
import { formatCurrency, formatDate, formatTimeRange } from '../../utils/formatters';
import CustomSelect from '../common/CustomSelect';
import DatePicker from '../common/DatePicker';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Усі' },
  { value: 'CONFIRMED', label: 'Підтверджені' },
  { value: 'PENDING', label: 'Очікують' },
  { value: 'CANCELLED', label: 'Скасовані' },
];

type BookingsPanelProps = {
  title?: string;
  description?: string;
  showPaymentStatus?: boolean;
  compact?: boolean;
  showHeading?: boolean;
};

const BookingsPanel = ({
  title = 'Мої бронювання',
  description,
  showPaymentStatus = false,
  compact = false,
  showHeading = true,
}: BookingsPanelProps) => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [cancelInfo, setCancelInfo] = useState<{ bookingId: number; message: string } | null>(null);
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ['me', 'bookings'],
    queryFn: fetchMyBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: (_, bookingId) => {
      // Find the cancelled booking to calculate time until slot
      const booking = bookingsQuery.data?.find((b) => b.id === bookingId);
      if (booking) {
        const slotStart = new Date(booking.schedule_slot_detail.start_time);
        const now = new Date();
        const hoursUntilSlot = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        let message = '';
        if (hoursUntilSlot < 24) {
          message = 'Оскільки скасування відбулося менше ніж за добу до заняття, кошти не повертаються.';
        } else {
          message = 'Кошти будуть повернуті на ваш рахунок протягом трьох діб.';
        }
        
        setCancelInfo({ bookingId, message });
        // Clear message after 5 seconds
        setTimeout(() => setCancelInfo(null), 5000);
      }
      queryClient.invalidateQueries({ queryKey: ['me', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    },
  });

  const filteredBookings = useMemo(() => {
    if (!bookingsQuery.data) {
      return [];
    }
    const filtered = bookingsQuery.data.filter((booking) => {
      const matchesStatus = statusFilter === 'ALL' || booking.status === statusFilter;
      const bookingDate = dayjs(booking.schedule_slot_detail.start_time);
      const afterFrom = fromDate ? bookingDate.isAfter(dayjs(fromDate).subtract(1, 'day')) : true;
      const beforeTo = toDate ? bookingDate.isBefore(dayjs(toDate).add(1, 'day')) : true;
      return matchesStatus && afterFrom && beforeTo;
    });
    // Sort: valid bookings (not CANCELLED) first, then canceled bookings
    return [...filtered].sort((a, b) => {
      const aIsCancelled = a.status === 'CANCELLED';
      const bIsCancelled = b.status === 'CANCELLED';
      if (aIsCancelled === bIsCancelled) {
        // If both have same cancellation status, sort by date (newest first)
        return (
          new Date(b.schedule_slot_detail.start_time).getTime() -
          new Date(a.schedule_slot_detail.start_time).getTime()
        );
      }
      // Valid bookings (not cancelled) come first
      return aIsCancelled ? 1 : -1;
    });
  }, [bookingsQuery.data, fromDate, toDate, statusFilter]);

  if (bookingsQuery.isLoading) {
    return <p>Завантаження бронювань...</p>;
  }

  return (
    <section className="detail-card">
      {showHeading && <h2>{title}</h2>}
      {showHeading && description && <p className="stat-card__label">{description}</p>}
      {!compact && (
        <div className="booking-filters">
          <label>
            Статус
            <CustomSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(String(value))}
              options={STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </label>
          <label>
            Від
            <DatePicker
              value={fromDate || null}
              onChange={(date) => setFromDate(date)}
              allowClear
              className="mini-calendar--compact"
            />
          </label>
          <label>
            До
            <DatePicker
              value={toDate || null}
              onChange={(date) => setToDate(date)}
              allowClear
              className="mini-calendar--compact"
            />
          </label>
        </div>
      )}
      {cancelInfo && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid var(--primary)',
            borderRadius: '0.75rem',
            marginBottom: '1rem',
            color: 'var(--primary)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Бронювання скасовано</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{cancelInfo.message}</p>
        </div>
      )}
      {filteredBookings.length === 0 ? (
        <p>{compact ? 'У вас ще немає бронювань.' : 'Немає бронювань за вказаними критеріями.'}</p>
      ) : (
        <ul className="booking-list">
          {filteredBookings.map((booking) => {
            const isCashPending =
              booking.payment?.method === 'CASH' && booking.payment.status === 'PENDING';
            return (
              <li className={`booking-card ${compact ? 'booking-card--compact' : ''}`} key={booking.id}>
                <div>
                  <p className="booking-title">
                    {booking.schedule_slot_detail.section.sportType} ·{' '}
                    {booking.schedule_slot_detail.section.level}
                  </p>
                  <p className="booking-card__meta">
                    {booking.schedule_slot_detail.hall.center_name ?? 'Центр'} ·{' '}
                    {booking.schedule_slot_detail.hall.name}
                  </p>
                  <p className="booking-card__meta">
                    {formatDate(booking.schedule_slot_detail.start_time)} ·{' '}
                    {formatTimeRange(
                      booking.schedule_slot_detail.start_time,
                      booking.schedule_slot_detail.end_time,
                    )}
                    {!compact && ` · ${formatCurrency(booking.price)}`}
                  </p>
                  <div className="badges-row" style={{ marginTop: compact ? '0.25rem' : '0.5rem' }}>
                    <span
                      className={`booking-status-badge ${
                        booking.status === 'CANCELLED'
                          ? 'booking-status-badge--canceled'
                          : 'booking-status-badge--valid'
                      }`}
                    >
                      {booking.status === 'CANCELLED' ? 'Скасований' : 'Валідний'}
                    </span>
                    {!compact && isCashPending && <span className="badge warning">Оплата готівкою</span>}
                    {!compact && showPaymentStatus && booking.payment && (
                      <span className="badge">
                        Оплата: {booking.payment.status}{' '}
                        {booking.payment.status === 'REFUNDED' ? '💸' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {booking.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    className={`ghost-button ${compact ? 'ghost-button--small' : ''}`}
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(booking.id)}
                  >
                    {cancelMutation.isPending ? 'Скасування...' : 'Скасувати'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default BookingsPanel;

