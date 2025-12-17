import { useState, useMemo, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchScheduleSlots, fetchSections } from '../../api/catalog';
import { createBooking, fetchMyMemberships } from '../../api/customer';
import { formatCurrency } from '../../utils/formatters';
import { parseApiError } from '../../utils/apiErrors';
import type { PaymentMethod, Booking } from '../../types/auth';
import CustomSelect from '../common/CustomSelect';
import DatePicker from '../common/DatePicker';

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

type PersonalTrainingModalProps = {
  trainerId: number;
  onClose: () => void;
};

const PersonalTrainingModal = ({ trainerId, onClose }: PersonalTrainingModalProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [notes, setNotes] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<Booking | null>(null);
  const queryClient = useQueryClient();

  // Fetch trainer's schedule slots for the next 7 days
  const slotsQuery = useQuery({
    queryKey: ['trainer-slots', trainerId],
    queryFn: () => fetchScheduleSlots({ trainerId }),
  });

  // Fetch sections to get trainer info
  const sectionsQuery = useQuery({
    queryKey: ['sections', 'all'],
    queryFn: () => fetchSections({}),
  });

  const trainer = useMemo(() => {
    if (!sectionsQuery.data) return null;
    for (const section of sectionsQuery.data) {
      const found = section.trainers.find((t) => t.id === trainerId);
      if (found) return found;
    }
    return null;
  }, [sectionsQuery.data, trainerId]);

  const membershipQuery = useQuery({
    queryKey: ['me', 'memberships'],
    queryFn: fetchMyMemberships,
  });

  // Get trainer's busy slots (where they have group training)
  const busySlots = useMemo(() => {
    if (!slotsQuery.data) return [];
    return slotsQuery.data.map((slot) => ({
      date: new Date(slot.start_time).toISOString().split('T')[0],
      startTime: new Date(slot.start_time).toTimeString().slice(0, 5),
      endTime: new Date(slot.end_time).toTimeString().slice(0, 5),
    }));
  }, [slotsQuery.data]);

  // Generate available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    const busyForDate = busySlots.filter((slot) => slot.date === selectedDate);
    
    // Generate hourly slots from 10:00 to 18:00
    const slots: string[] = [];
    for (let hour = 10; hour <= 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const isBusy = busyForDate.some((busy) => {
        const busyStart = busy.startTime;
        const busyEnd = busy.endTime;
        return timeStr >= busyStart && timeStr < busyEnd;
      });
      if (!isBusy) {
        slots.push(timeStr);
      }
    }
    return slots;
  }, [selectedDate, busySlots]);

  const membership = useMemo(() => {
    if (!membershipQuery.data) return null;
    return membershipQuery.data.find((item) => item.status === 'ACTIVE') ?? membershipQuery.data[0];
  }, [membershipQuery.data]);

  const basePrice = 1500;
  const finalPrice = basePrice;

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setBookingResult(data);
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-slots'] });
    },
    onError: (error) => {
      const errorMessage = parseApiError(error, 'Не вдалося створити бронювання.');
      setServerError(errorMessage);
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!selectedDate || !selectedTime) {
      setServerError('Будь ласка, оберіть дату та час.');
      return;
    }

    // Create datetime from selected date and time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(hours + 1, minutes, 0, 0); // 1 hour session

    // Check if trainer is available at this time
    const isBusy = busySlots.some((slot) => {
      if (slot.date !== selectedDate) return false;
      const slotStart = new Date(`${selectedDate}T${slot.startTime}`);
      const slotEnd = new Date(`${selectedDate}T${slot.endTime}`);
      return (
        (startDateTime >= slotStart && startDateTime < slotEnd) ||
        (endDateTime > slotStart && endDateTime <= slotEnd) ||
        (startDateTime <= slotStart && endDateTime >= slotEnd)
      );
    });

    if (isBusy) {
      setServerError('Тренер зайнятий у вибраний час. Оберіть інший час.');
      return;
    }

    // For personal training, we need to find an available slot
    // First, try to find an exact matching slot (same date and time)
    let matchingSlot = slotsQuery.data?.find((slot) => {
      const slotDate = new Date(slot.start_time).toISOString().split('T')[0];
      const slotStartTime = new Date(slot.start_time).toTimeString().slice(0, 5);
      return slotDate === selectedDate && slotStartTime === selectedTime && slot.trainer?.id === trainerId && slot.available_spots > 0;
    });

    // If no exact match, try to find any available slot for this trainer on the selected date
    // This allows booking personal training even if there's no exact time slot
    if (!matchingSlot) {
      matchingSlot = slotsQuery.data?.find((slot) => {
        const slotDate = new Date(slot.start_time).toISOString().split('T')[0];
        return slotDate === selectedDate && slot.trainer?.id === trainerId && slot.available_spots > 0;
      });
    }

    // If still no slot found on the selected date, but trainer is free,
    // try to find any available slot for this trainer (on any date)
    // This is a fallback for personal training when trainer is available but no slot exists
    if (!matchingSlot) {
      const anyTrainerSlot = slotsQuery.data?.find((slot) => slot.trainer?.id === trainerId && slot.available_spots > 0);
      
      if (anyTrainerSlot) {
        // Use this slot for booking, but note it's for personal training at requested time
        matchingSlot = anyTrainerSlot;
      } else {
        // No slots available for this trainer at all
        setServerError('На жаль, у тренера немає доступних слотів для бронювання. Зверніться до адміністратора.');
        return;
      }
    }

    // If we found a slot (exact match or fallback), create the booking
    if (paymentMethod === 'CARD') {
      if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv) {
        setServerError('Заповніть реквізити картки.');
        return;
      }
    }
    
    mutation.mutate({
      schedule_slot: matchingSlot.id,
      payment_method: paymentMethod,
      notes: notes || `Персональне тренування з тренером ${trainer?.first_name} ${trainer?.last_name}. Запрошений час: ${selectedDate} ${selectedTime}`,
    });
  };

  if (bookingResult) {
    return (
      <div className="drawer-backdrop" onClick={onClose}>
        <div className="booking-drawer" onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Бронювання створено!</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Ваше персональне тренування успішно заброньовано.
            </p>
            <button type="button" className="primary-button" onClick={onClose}>
              Закрити
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="booking-drawer" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Персональне тренування</h2>
          {trainer && (
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
              Тренер: <strong>{trainer.first_name} {trainer.last_name}</strong> ({trainer.specialization})
            </p>
          )}
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            Оберіть дату та час для персонального тренування. Тренер має бути вільним у вибраний час.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Дата
              </label>
              <DatePicker
                value={selectedDate}
                onChange={(value) => setSelectedDate(value || null)}
                minDate={new Date().toISOString().split('T')[0]}
                maxDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
            </div>

            {selectedDate && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Час
                </label>
                {availableTimeSlots.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>
                    На цю дату тренер зайнятий весь день.
                  </p>
                ) : (
                  <CustomSelect
                    value={selectedTime}
                    onChange={(value) => setSelectedTime(String(value))}
                    placeholder="Оберіть час"
                    options={availableTimeSlots.map((time) => ({ value: time, label: time }))}
                  />
                )}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Вартість
              </label>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--primary)' }}>
                {formatCurrency(finalPrice)}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Спосіб оплати
              </label>
              <CustomSelect
                value={paymentMethod}
                onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                options={paymentOptions}
              />
            </div>

            {paymentMethod === 'CARD' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Ім'я на картці
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="ІВАН ІВАНОВ"
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Номер картки
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Термін дії
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="123"
                      maxLength={3}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Примітки (необов'язково)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Особливі побажання або запити..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            {serverError && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {serverError.includes('Missing refresh token') || serverError.includes('refresh token')
                  ? 'Сесія закінчилася. Будь ласка, увійдіть знову.'
                  : serverError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="secondary-button" onClick={onClose}>
                Скасувати
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={mutation.isPending || !selectedDate || !selectedTime}
              >
                {mutation.isPending ? 'Обробка...' : 'Забронювати'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonalTrainingModal;

