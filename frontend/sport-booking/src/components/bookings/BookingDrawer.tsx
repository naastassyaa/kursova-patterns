import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchScheduleSlotById } from '../../api/catalog';
import { createBooking, fetchMyMemberships } from '../../api/customer';
import type { PaymentMethod, Booking } from '../../types/auth';
import { formatCurrency, formatDate, formatTimeRange } from '../../utils/formatters';
import { parseApiError } from '../../utils/apiErrors';
import CustomSelect from '../common/CustomSelect';

const MEMBERSHIP_DISCOUNTS: Record<string, number> = {
  SINGLE: 1,
  MONTHLY: 0.95,
  PREMIUM: 0.85,
  CORPORATE: 0.75,
};

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'CARD', label: 'Банківська карта' },
  { value: 'APPLE_PAY', label: 'Apple Pay' },
  { value: 'GOOGLE_PAY', label: 'Google Pay' },
  { value: 'CASH', label: 'Готівка на стійці' },
];

type BookingDrawerProps = {
  slotId: number | null;
  onClose: () => void;
};

const BookingDrawer = ({ slotId, onClose }: BookingDrawerProps) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [notes, setNotes] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<Booking | null>(null);
  const queryClient = useQueryClient();

  const slotQuery = useQuery({
    queryKey: ['catalog', 'slot', slotId],
    queryFn: () => fetchScheduleSlotById(slotId ?? 0),
    enabled: Boolean(slotId),
  });

  const membershipQuery = useQuery({
    queryKey: ['me', 'memberships'],
    queryFn: fetchMyMemberships,
    enabled: Boolean(slotId),
  });

  useEffect(() => {
    if (slotId) {
      setNotes('');
      setServerError(null);
      setBookingResult(null);
      setPaymentMethod('CARD');
      setCardHolder('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
    }
  }, [slotId]);

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setBookingResult(data);
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      if (slotId) {
        queryClient.invalidateQueries({ queryKey: ['catalog', 'slot', slotId] });
      }
    },
    onError: (error) => {
      const errorMessage = parseApiError(error, 'Немає вільних місць або дані некоректні.');
      // Check if it's a duplicate booking error
      if (errorMessage.includes('вже маєте бронювання') || errorMessage.includes('забронювати двічі')) {
        setServerError(errorMessage);
      } else if (errorMessage.includes('віком') || errorMessage.includes('вік') || errorMessage.includes('Діти') || errorMessage.includes('дорослих')) {
        // Age restriction error
        setServerError(errorMessage);
      } else {
        setServerError(errorMessage);
      }
    },
  });

  const membership = useMemo(() => {
    if (!membershipQuery.data) return null;
    return membershipQuery.data.find((item) => item.status === 'ACTIVE') ?? membershipQuery.data[0];
  }, [membershipQuery.data]);

  const discountMultiplier =
    (membership && MEMBERSHIP_DISCOUNTS[membership.subscription_detail.type]) ?? 1;

  const expectedPrice = slotQuery.data
    ? formatCurrency(Number(slotQuery.data.section.base_price) * discountMultiplier)
    : null;

  if (!slotId) {
    return null;
  }

  if (slotQuery.isLoading || !slotQuery.data) {
    return (
      <div className="drawer-backdrop" onClick={onClose}>
        <div className="booking-drawer" onClick={(event) => event.stopPropagation()}>
          <p>Завантаження інформації про слот...</p>
        </div>
      </div>
    );
  }

  const slot = slotQuery.data;
  const isSoldOut = slot?.available_spots !== undefined && slot.available_spots <= 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!slotId || mutation.isPending) {
      return;
    }
    if (paymentMethod === 'CARD') {
      if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv) {
        setServerError('Заповніть реквізити картки.');
        return;
      }
    }
    setServerError(null);
    mutation.mutate({
      schedule_slot: slotId,
      payment_method: paymentMethod,
      notes,
    });
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="booking-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <p className="stat-card__label">{slot.section.sportType}</p>
            <h2>{formatTimeRange(slot.start_time, slot.end_time)}</h2>
            <p className="section-card__meta">
              {slot.hall.center.name} · {slot.hall.name}
            </p>
          </div>
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
          <section>
            <h3>Тренери</h3>
            <div className="trainer-chips">
              {slot.section.trainers.map((trainer) => (
                <span className="trainer-chip" key={trainer.id}>
                  {trainer.first_name} {trainer.last_name}
                </span>
              ))}
              {slot.section.trainers.length === 0 && (
                <span className="trainer-chip" style={{ opacity: 0.6 }}>
                  Не призначено
                </span>
              )}
            </div>
          </section>
          <section>
            <h3>Зал та обладнання</h3>
            <p>
              {slot.hall.type} · місткість {slot.hall.capacity} · {slot.hall.availability ?? 'Графік уточнюйте'}
            </p>
            {slot.hall.equipment && <p style={{ color: 'var(--text-muted)' }}>{slot.hall.equipment}</p>}
          </section>
          <section className="booking-stats">
            <div>
              <p className="stat-card__label">Вільні місця</p>
              <span className="stat-card__value">{slot.available_spots}</span>
            </div>
            <div>
              <p className="stat-card__label">Очікувана вартість</p>
              <span className="stat-card__value">{expectedPrice ?? '—'}</span>
              {membership ? (
                <p className="stat-card__label">
                  {membership.subscription_detail.type} · множник ×{discountMultiplier.toFixed(2)}
                </p>
              ) : (
                <p className="stat-card__label">Без абонемента</p>
              )}
            </div>
            <div>
              <p className="stat-card__label">Дата</p>
              <span className="stat-card__value">{formatDate(slot.start_time)}</span>
            </div>
          </section>
          <section>
            <h3>Оформлення бронювання</h3>
            <form className="booking-form" onSubmit={handleSubmit}>
              <label>
                Спосіб оплати
                <CustomSelect
                  value={paymentMethod}
                  onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  options={paymentOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
              </label>
              <p style={{ marginTop: '-0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {paymentMethod === 'CASH'
                  ? 'Оплата готівкою буде здійснена на стійці після оформлення.'
                  : 'Оплата обробляється автоматично після підтвердження заявки.'}
              </p>
              {paymentMethod === 'CARD' && (
                <div className="card-form">
                  <label>
                    Власник карти
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(event) => setCardHolder(event.target.value)}
                      placeholder="Ім'я та прізвище"
                    />
                  </label>
                  <label>
                    Номер карти
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(event) => setCardNumber(event.target.value.replace(/[^\d\s]/g, ''))}
                      placeholder="0000 0000 0000 0000"
                    />
                  </label>
                  <div className="card-line">
                    <label>
                      Термін дії
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(event) => setCardExpiry(event.target.value.replace(/[^\d/]/g, ''))}
                      />
                    </label>
                    <label>
                      CVV
                      <input
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(event) => setCardCvv(event.target.value.replace(/[^\d]/g, ''))}
                      />
                    </label>
                  </div>
                </div>
              )}
              <label>
                Коментар
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Побажання, особливі умови..."
                />
              </label>
              {serverError && <div className="form-error">{serverError}</div>}
              {bookingResult && (
                <div className="form-success" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '1.05rem' }}>
                    Бронювання {bookingResult.status === 'CONFIRMED' ? 'підтверджено' : 'в очікуванні'}!
                  </p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                    Ви отримаєте сповіщення з деталями бронювання.
                    {bookingResult.payment?.method === 'CASH' &&
                      bookingResult.payment.status === 'PENDING' &&
                      ' Оплата готівкою буде здійснена на стійці.'}
                  </p>
                </div>
              )}
              <button className="primary-button" type="submit" disabled={mutation.isPending || isSoldOut}>
                {isSoldOut ? 'Немає місць' : mutation.isPending ? 'Створення...' : 'Забронювати'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BookingDrawer;

