import apiClient from './client';

type Params = Record<string, string | number | undefined>;

const normalizeResponse = (data: any) => {
  if (Array.isArray(data)) {
    return data;
  }
  if (data?.results) {
    return data;
  }
  return { results: data ? [data] : [], count: data?.length ?? 0 };
};

export const adminList = async (resource: string, params: Params = {}) => {
  const { data } = await apiClient.get(`/admin/${resource}/`, { params });
  return normalizeResponse(data);
};

export const adminCreate = async (resource: string, payload: Record<string, unknown>) => {
  const { data } = await apiClient.post(`/admin/${resource}/`, payload);
  return data;
};

export const adminUpdate = async (
  resource: string,
  id: number | string,
  payload: Record<string, unknown>,
) => {
  const { data } = await apiClient.put(`/admin/${resource}/${id}/`, payload);
  return data;
};

export const adminDelete = async (resource: string, id: number | string) => {
  await apiClient.delete(`/admin/${resource}/${id}/`);
};

