import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AxiosError } from 'axios';

import dayjs from 'dayjs';



import { createMembership } from '../../api/customer';

import type { PaymentMethod, SubscriptionPlan } from '../../types/auth';

import { formatCurrency } from '../../utils/formatters';

import { parseApiError } from '../../utils/apiErrors';

import CustomSelect from '../common/CustomSelect';
import DateField from '../common/DateField';



const paymentOptions: { value: PaymentMethod; label: string }[] = [

  { value: 'CARD', label: 'Банківська карта' },

  { value: 'APPLE_PAY', label: 'Apple Pay' },

  { value: 'GOOGLE_PAY', label: 'Google Pay' },

  { value: 'CASH', label: 'Готівка на стійці' },

];



type MembershipModalProps = {

  plans: SubscriptionPlan[];

  onClose: () => void;

  initialPlanId?: number | null;

};



const MembershipModal = ({ plans, onClose, initialPlanId = null }: MembershipModalProps) => {

  const [selectedPlan, setSelectedPlan] = useState<number | null>(

    initialPlanId ?? plans[0]?.id ?? null,

  );

  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const [cardHolder, setCardHolder] = useState('');

  const [cardNumber, setCardNumber] = useState('');

  const [cardExpiry, setCardExpiry] = useState('');

  const [cardCvv, setCardCvv] = useState('');

  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();



  const activePlan = useMemo(

    () => plans.find((plan) => plan.id === selectedPlan) ?? plans[0] ?? null,

    [plans, selectedPlan],

  );



  const paymentSelectOptions = useMemo(

    () =>

      paymentOptions.map((option) => ({

        value: option.value,

        label: option.label,

      })),

    [],

  );



  useEffect(() => {

    const nextPlanId = initialPlanId ?? plans[0]?.id ?? null;

    setSelectedPlan((prev) => (prev === nextPlanId ? prev : nextPlanId));

    setPaymentMethod(null);

    setCardHolder('');

    setCardNumber('');

    setCardExpiry('');

    setCardCvv('');

  }, [initialPlanId, plans]);



  const mutation = useMutation({

    mutationFn: createMembership,

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['me', 'memberships'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });

      onClose();

    },

    onError: (err) => {

      if (err instanceof AxiosError && err.response?.status === 403) {

        setError('Оформлення доступне через адміністратора. Звʼяжіться зі стійкою.');

      } else {

        setError(parseApiError(err, 'Не вдалося оформити абонемент. Спробуйте пізніше.'));

      }

    },

  });



  if (plans.length === 0) {

    return (

      <div className="drawer-backdrop" onClick={onClose}>

        <div className="booking-drawer" onClick={(event) => event.stopPropagation()}>

          <p>Наразі немає доступних планів. Звʼяжіться з адміністратором.</p>

        </div>

      </div>

    );

  }



  const handleSubmit = () => {

    setError(null);

    if (!activePlan) {

      setError('Оберіть план обовʼязково');

      return;

    }

    if (!startDate) {

      setError('Вкажіть дату початку абонемента.');

      return;

    }

    if (!paymentMethod) {

      setError('Оберіть спосіб оплати.');

      return;

    }

    const normalizedStartDate = dayjs(startDate).format('YYYY-MM-DD');

    const endDate = dayjs(normalizedStartDate).add(activePlan.duration, 'day').format('YYYY-MM-DD');

    if (paymentMethod === 'CARD') {

      if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv) {

        setError('Заповніть реквізити картки.');

        return;

      }

    }



    mutation.mutate({

      subscription: activePlan.id,

      start_date: normalizedStartDate,

      end_date: endDate,

      payment_method: paymentMethod,

    });

  };



  return (

    <div className="drawer-backdrop" onClick={onClose}>

      <div className="booking-drawer" onClick={(event) => event.stopPropagation()}>

        <header className="drawer-header">

          <h2>Придбати абонемент</h2>

          <button

            type="button"

            className="ghost-button close-button"

            onClick={onClose}

            aria-label="Закрити"

          >

            &times;

          </button>

        </header>

        <div className="drawer-body membership-form">

          <div className="selected-plan">

            <p className="selected-plan__title">{activePlan?.type}</p>

            <p className="selected-plan__meta">

              {activePlan?.duration} днів ·{' '}
              {activePlan ? (
                <>
                  {activePlan.final_price !== undefined && activePlan.final_price !== null && activePlan.final_price < parseFloat(activePlan.price) ? (
                    <>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                        {formatCurrency(activePlan.price)}
                      </span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {formatCurrency(activePlan.final_price.toString())}
                      </span>
                      {activePlan.discount_percentage && (
                        <span
                          style={{
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          -{Math.round(activePlan.discount_percentage)}%
                        </span>
                      )}
                    </>
                  ) : (
                    formatCurrency(activePlan.price)
                  )}
                </>
              ) : (
                '—'
              )}

            </p>
            {activePlan?.promotion && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)' }}>
                🎉 {activePlan.promotion.title}
              </p>
            )}

          </div>

          <label>

            Дата початку

            <DateField

              value={startDate}

              onChange={(nextDate) => setStartDate(nextDate || dayjs().format('YYYY-MM-DD'))}

              minDate={dayjs().format('YYYY-MM-DD')}

              allowClear={false}

            />

          </label>

          {activePlan && (

            <p style={{ marginTop: '-0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>

              Дата завершення:{' '}

              {dayjs(startDate || dayjs().format('YYYY-MM-DD'))

                .add(activePlan.duration, 'day')

                .format('DD.MM.YYYY')}

            </p>

          )}

          <label>

            Спосіб оплати

            <CustomSelect

              value={paymentMethod}

              onChange={(value) => setPaymentMethod((value as PaymentMethod) || null)}

              options={paymentSelectOptions}

              placeholder="Оберіть спосіб оплати"

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

          {error && <div className="form-error">{error}</div>}

          <button

            type="button"

            className="primary-button"

            onClick={handleSubmit}

            disabled={mutation.isPending}

          >

            {mutation.isPending ? 'Оформлення…' : 'Підтвердити'}

          </button>

        </div>

      </div>

    </div>

  );

};



export default MembershipModal;



