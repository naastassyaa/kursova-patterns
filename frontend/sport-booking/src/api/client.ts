import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

import tokenStorage from '../utils/tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:8000/api';

type FailedRequest = {
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
const requestQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null) => {
  requestQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  });
  requestQueue.length = 0;
};

const refreshAccessToken = async (): Promise<string> => {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    throw new Error('Missing refresh token');
  }
  const response = await axios.post<{ access: string; refresh: string }>(
    `${API_BASE_URL}/auth/token/refresh/`,
    { refresh },
  );
  tokenStorage.setTokens(response.data);
  return response.data.access;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    // eslint-disable-next-line no-param-reassign
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        requestQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();
      processQueue(null, newAccessToken);
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      tokenStorage.clear();
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;

