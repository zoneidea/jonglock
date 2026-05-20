import {API_BASE_URL} from '../config/api';

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type QueryParams = Record<string, string | number | null | undefined>;

export type Announcement = {
  id: number;
  organizationId: number;
  marketId: number | null;
  marketName: string;
  type: 'news' | 'banner';
  title: string;
  description: string;
  imageUrl: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
};

function buildQuery(params: QueryParams = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `?${query}` : '';
}

function normalizeUrl(url: string) {
  if (!url) {
    return '';
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const origin = API_BASE_URL.replace(/\/api$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeAnnouncement(item: Announcement): Announcement {
  return {
    ...item,
    imageUrl: normalizeUrl(item.imageUrl),
  };
}

async function request<T>(path: string, params?: QueryParams): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`);
  if (!response.ok) {
    throw new Error(`Announcement API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

export async function getAnnouncements(params: {type?: 'news' | 'banner'; limit?: number} = {}) {
  const items = await request<Announcement[]>('/public/announcements', params);
  return items.map(normalizeAnnouncement);
}
