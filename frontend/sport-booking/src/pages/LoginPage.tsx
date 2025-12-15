import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useAuth } from '../context/AuthContext';
import LoadingState from '../components/common/LoadingState';
import { clearCurrentProfile, ensureProfileForEmail } from '../utils/profileStorage';

const loginSchema = z.object({
  email: z.string().email('Некоректний email'),
  password: z.string().min(6, 'Мінімум 6 символів'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/account', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <LoadingState />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      clearCurrentProfile();
      await login(values);
      ensureProfileForEmail(values.email);
      const redirectTo =
        (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/account';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError('Невірні дані або сервер недоступний.');
      console.error(error);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit(onSubmit)}>
        <h1>Вхід</h1>
        <label>
          Email
          <input type="email" {...register('email')} />
          {errors.email && <span className="form-error">{errors.email.message}</span>}
        </label>
        <label>
          Пароль
          <input type="password" {...register('password')} />
          {errors.password && <span className="form-error">{errors.password.message}</span>}
        </label>
        {serverError && <div className="form-error">{serverError}</div>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Вхід...' : 'Увійти'}
        </button>
        <p style={{ textAlign: 'center' }}>
          Немає акаунта? <Link to="/auth/register">Зареєструватися</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;

