import apiClient from './client';
import type { LoginPayload, RegisterPayload, TokenResponse } from '../types/auth';

export const registerUser = async (payload: RegisterPayload) => {
  const { first_name, last_name, email, password, date_of_birth } = payload;
  const requestBody = {
    username: email,
    email,
    password,
    first_name,
    last_name,
    date_of_birth,
  };
  const { data } = await apiClient.post('/auth/register/', requestBody);
  return data;
};

export const loginUser = async (payload: LoginPayload) => {
  const requestBody = {
    username: payload.email,
    password: payload.password,
  };
  const { data } = await apiClient.post<TokenResponse>('/auth/token/', requestBody);
  return data;
};

export const refreshToken = async (refresh: string) => {
  const { data } = await apiClient.post<TokenResponse>('/auth/token/refresh/', { refresh });
  return data;
};


