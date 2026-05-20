import {API_BASE_URL} from '../config/api';

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type QueryParams = Record<string, string | number | null | undefined>;

export type Market = {
  id: number;
  organizationId: number;
  code: string;
  name: string;
  description: string;
  terms: string;
  mainImageUrl: string;
  address: string;
  openingHours: string;
  phone: string;
  lineId: string;
  email: string;
  openDate?: string | null;
  closeDate?: string | null;
  galleryImages: string[];
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

function normalizeMarket(market: Market): Market {
  const galleryImages = (market.galleryImages || []).map(normalizeUrl).filter(Boolean);
  const mainImageUrl = normalizeUrl(market.mainImageUrl) || galleryImages[0] || '';

  return {
    ...market,
    mainImageUrl,
    galleryImages: galleryImages.length ? galleryImages : mainImageUrl ? [mainImageUrl] : [],
  };
}

async function request<T>(path: string, params?: QueryParams): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`);
  if (!response.ok) {
    throw new Error(`Market API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

export async function getMarkets(params: {q?: string} = {}) {
  const markets = await request<Market[]>('/public/markets', {q: params.q});
  return markets.map(normalizeMarket);
}

export async function getMarket(marketId: number) {
  const market = await request<Market | null>(`/public/markets/${marketId}`);
  return market ? normalizeMarket(market) : null;
}
