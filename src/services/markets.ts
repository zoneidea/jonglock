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

export type FloorPlan = {
  id: number;
  organizationId: number;
  marketId: number;
  name: string;
  planImageUrl: string;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  boothCount: number;
};

export type BoothAvailabilityStatus = 'available' | 'booked' | 'processing' | 'unavailable';

export type Booth = {
  id: number;
  organizationId: number;
  marketId: number;
  floorPlanId: number;
  categoryId?: number | null;
  categoryName: string;
  code: string;
  name: string;
  price: number;
  grossPrice: number;
  status: string;
  availabilityStatus: BoothAvailabilityStatus;
  availabilityDates?: BoothDateAvailability[];
  availableDateCount?: number;
  unavailableDateCount?: number;
  selectedDateCount?: number;
};

export type BoothDateAvailability = {
  date: string;
  status: BoothAvailabilityStatus;
};

export type BoothAvailabilityResult = {
  booth: Booth;
  dates: BoothDateAvailability[];
} | null;

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

function normalizeFloorPlan(floorPlan: FloorPlan): FloorPlan {
  return {
    ...floorPlan,
    planImageUrl: normalizeUrl(floorPlan.planImageUrl),
    boothCount: Number(floorPlan.boothCount || 0),
  };
}

function normalizeBooth(booth: Booth): Booth {
  return {
    ...booth,
    price: Number(booth.price || 0),
    grossPrice: Number(booth.grossPrice || booth.price || 0),
    availableDateCount: Number(booth.availableDateCount || 0),
    unavailableDateCount: Number(booth.unavailableDateCount || 0),
    selectedDateCount: Number(booth.selectedDateCount || 0),
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

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
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

export async function getMarketFloorPlans(marketId: number) {
  const floorPlans = await request<FloorPlan[]>(`/public/markets/${marketId}/floor-plans`);
  return floorPlans.map(normalizeFloorPlan);
}

export async function getFloorPlanBooths(floorPlanId: number, date?: string) {
  const booths = await request<Booth[]>(`/public/floor-plans/${floorPlanId}/booths`, {date});
  return booths.map(normalizeBooth);
}

export async function getFloorPlanBoothAvailability(floorPlanId: number, dates: string[]) {
  const booths = await post<Booth[]>(`/public/floor-plans/${floorPlanId}/booths/availability`, {dates});
  return booths.map(normalizeBooth);
}

export async function checkBoothAvailability(boothId: number, dates: string[]) {
  const result = await post<BoothAvailabilityResult>(`/public/booths/${boothId}/availability`, {dates});
  return result
    ? {
        booth: normalizeBooth(result.booth),
        dates: result.dates,
      }
    : null;
}
