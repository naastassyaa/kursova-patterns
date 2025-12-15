import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';

import { registerUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { saveProfile, StoredProfile } from '../utils/profileStorage';
import DateField from '../components/common/DateField';

const registerSchema = z
  .object({
    first_name: z
      .string()
      .min(2, 'Мінімум 2 символи')
      .transform((val) => val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase()),
    last_name: z
      .string()
      .min(2, 'Мінімум 2 символи')
      .transform((val) => val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase()),
    email: z
      .string()
      .email('Некоректний email')
      .toLowerCase(),
    date_of_birth: z
      .string()
      .min(1, 'Дата народження обов\'язкова')
      .refine((date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        return actualAge >= 0 && actualAge <= 120;
      }, 'Некоректна дата народження'),
    password: z.string().min(6, 'Мінімум 6 символів'),
    confirm: z.string().min(6, 'Мінімум 6 символів'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Паролі повинні збігатися',
    path: ['confirm'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      date_of_birth: '',
      password: '',
      confirm: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        date_of_birth: values.date_of_birth,
        password: values.password,
      });
      const profile: StoredProfile = {
        firstName: values.first_name,
        lastName: values.last_name,
        email: values.email,
        phone: '',
        dob: values.date_of_birth,
      };
      saveProfile(profile);
      await login({ email: values.email, password: values.password });
      navigate('/');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.email?.[0] || 
                          error?.response?.data?.detail || 
                          error?.response?.data?.non_field_errors?.[0] ||
                          'Не вдалося створити акаунт. Спробуйте ще раз.';
      setServerError(errorMessage);
      console.error(error);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit(onSubmit)}>
        <h1>Реєстрація</h1>
        <label>
          Імʼя
          <input type="text" {...register('first_name')} />
          {errors.first_name && <span className="form-error">{errors.first_name.message}</span>}
        </label>
        <label>
          Прізвище
          <input type="text" {...register('last_name')} />
          {errors.last_name && <span className="form-error">{errors.last_name.message}</span>}
        </label>
        <label>
          Email
          <input type="email" {...register('email')} />
          {errors.email && <span className="form-error">{errors.email.message}</span>}
        </label>
        <label>
          Дата народження
          <DateField
            value={watch('date_of_birth') || null}
            onChange={(value) => setValue('date_of_birth', value || '', { shouldValidate: true })}
            maxDate={dayjs().format('YYYY-MM-DD')}
            allowClear={false}
          />
          {errors.date_of_birth && <span className="form-error">{errors.date_of_birth.message}</span>}
        </label>
        <label>
          Пароль
          <input type="password" {...register('password')} />
          {errors.password && <span className="form-error">{errors.password.message}</span>}
        </label>
        <label>
          Підтвердження пароля
          <input type="password" {...register('confirm')} />
          {errors.confirm && <span className="form-error">{errors.confirm.message}</span>}
        </label>
        {serverError && <div className="form-error">{serverError}</div>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Створення...' : 'Зареєструватися'}
        </button>
        <p style={{ textAlign: 'center' }}>
          Маєте акаунт? <Link to="/auth/login">Увійти</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;

