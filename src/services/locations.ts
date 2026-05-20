import {API_BASE_URL} from '../config/api';

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type QueryParams = Record<string, string | number | null | undefined>;

export type Province = {
  id: number;
  code: string;
  nameTh: string;
  nameEn: string;
  geographyId: number;
  geographyName?: string;
};

export type Amphure = {
  id: number;
  code: string;
  nameTh: string;
  nameEn: string;
  provinceId: number;
  provinceNameTh?: string;
  provinceNameEn?: string;
};

export type Subdistrict = {
  id: number;
  zipCode: string;
  nameTh: string;
  nameEn: string;
  amphureId: number;
  amphureNameTh?: string;
  amphureNameEn?: string;
  provinceId?: number;
  provinceNameTh?: string;
  provinceNameEn?: string;
};

function buildQuery(params: QueryParams = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `?${query}` : '';
}

async function request<T>(path: string, params?: QueryParams): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`);
  if (!response.ok) {
    throw new Error(`Location API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

export function getProvinces(params: {q?: string; limit?: number} = {}) {
  return request<Province[]>('/locations/provinces', {
    q: params.q,
    limit: params.limit || 100,
  });
}

export function getAmphures(params: {provinceId: number; q?: string; limit?: number}) {
  return request<Amphure[]>('/locations/amphures', {
    provinceId: params.provinceId,
    q: params.q,
    limit: params.limit || 200,
  });
}

export function getSubdistricts(params: {amphureId: number; q?: string; limit?: number}) {
  return request<Subdistrict[]>('/locations/subdistricts', {
    amphureId: params.amphureId,
    q: params.q,
    limit: params.limit || 200,
  });
}
