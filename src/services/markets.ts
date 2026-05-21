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

export type BoothHoldResult = {
  bookingId: number;
  publicId: string;
  organizationId: number;
  marketId: number;
  floorPlanId: number;
  boothId: number;
  lockedDates: string[];
  unavailableDates: string[];
  expiresAt?: string | null;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
};

export type BoothHoldUser = {
  email: string;
  name?: string;
};

export type MarketAccessory = {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  grossPrice: number;
  stockQuantity: number;
  quantity?: number;
  lineTotal?: number;
};

export type BookingSummaryAccessoryInput = {
  accessoryId: number;
  quantity: number;
};

export type BookingSummary = {
  bookingId: number;
  publicId: string;
  status: string;
  marketId: number;
  expiresAt?: string | null;
  boothSubtotal: number;
  accessorySubtotal: number;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatEnabled: boolean;
  vatRate: number;
  coupon: {
    id: number;
    code: string;
    name: string;
    discountType: 'amount' | 'percent';
    discountValue: number;
    discountAmount: number;
  } | null;
  items: Array<{
    id: number;
    boothId: number;
    boothCode: string;
    boothName: string;
    bookingDate: string;
    unitPrice: number;
  }>;
  accessories: MarketAccessory[];
};

export type CartBooking = {
  bookingId: number;
  publicId: string;
  organizationId: number;
  marketId: number;
  marketName: string;
  marketImageUrl: string;
  status: string;
  expiresAt?: string | null;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatEnabled: boolean;
  vatRate: number;
  items: BookingSummary['items'];
  accessories: MarketAccessory[];
};

export type BookingConfirmResult = {
  bookingId: number;
  publicId: string;
  organizationId: number;
  marketId: number;
  status: string;
  expiresAt?: string | null;
  totalAmount: number;
};

type CachedValue<T> = {
  value: T;
  expiresAt: number;
};

const STATIC_CACHE_TTL_MS = 5 * 60 * 1000;
const AVAILABILITY_CACHE_TTL_MS = 30 * 1000;
const marketsCache = new Map<string, CachedValue<Market[]>>();
const marketCache = new Map<number, CachedValue<Market | null>>();
const floorPlansCache = new Map<number, CachedValue<FloorPlan[]>>();
const boothAvailabilityCache = new Map<string, CachedValue<Booth[]>>();

function readCache<T>(cache: Map<string | number, CachedValue<T>>, key: string | number) {
  const item = cache.get(key);
  if (!item) {
    return null;
  }
  if (item.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function writeCache<T>(cache: Map<string | number, CachedValue<T>>, key: string | number, value: T, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function warmMarketFloorPlans(marketId: number) {
  return getMarketFloorPlans(marketId).catch(() => []);
}

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

function normalizeAccessory(accessory: MarketAccessory): MarketAccessory {
  return {
    ...accessory,
    imageUrl: normalizeUrl(accessory.imageUrl),
    price: Number(accessory.price || 0),
    grossPrice: Number(accessory.grossPrice || accessory.price || 0),
    stockQuantity: Number(accessory.stockQuantity || 0),
    quantity: Number(accessory.quantity || 0),
    lineTotal: Number(accessory.lineTotal || 0),
  };
}

function normalizeSummary(summary: BookingSummary): BookingSummary {
  return {
    ...summary,
    boothSubtotal: Number(summary.boothSubtotal || 0),
    accessorySubtotal: Number(summary.accessorySubtotal || 0),
    subtotalAmount: Number(summary.subtotalAmount || 0),
    discountAmount: Number(summary.discountAmount || 0),
    vatAmount: Number(summary.vatAmount || 0),
    totalAmount: Number(summary.totalAmount || 0),
    vatRate: Number(summary.vatRate || 0),
    items: (summary.items || []).map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice || 0),
    })),
    accessories: (summary.accessories || []).map(normalizeAccessory),
  };
}

function normalizeCartBooking(booking: CartBooking): CartBooking {
  return {
    ...booking,
    marketImageUrl: normalizeUrl(booking.marketImageUrl),
    subtotalAmount: Number(booking.subtotalAmount || 0),
    discountAmount: Number(booking.discountAmount || 0),
    vatAmount: Number(booking.vatAmount || 0),
    totalAmount: Number(booking.totalAmount || 0),
    vatRate: Number(booking.vatRate || 0),
    items: (booking.items || []).map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice || 0),
    })),
    accessories: (booking.accessories || []).map(normalizeAccessory),
  };
}

async function request<T>(path: string, params?: QueryParams): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
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
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {message?: string};
    return payload.message || `Market API failed with status ${response.status}`;
  } catch {
    return `Market API failed with status ${response.status}`;
  }
}

export async function getMarkets(params: {q?: string} = {}) {
  const cacheKey = params.q || '';
  const cached = readCache(marketsCache, cacheKey);
  if (cached) {
    return cached;
  }
  const markets = await request<Market[]>('/public/markets', {q: params.q});
  const normalized = markets.map(normalizeMarket);
  writeCache(marketsCache, cacheKey, normalized, STATIC_CACHE_TTL_MS);
  normalized.forEach((market) => writeCache(marketCache, market.id, market, STATIC_CACHE_TTL_MS));
  return normalized;
}

export async function getMarket(marketId: number) {
  const cached = readCache(marketCache, marketId);
  if (cached) {
    return cached;
  }
  const market = await request<Market | null>(`/public/markets/${marketId}`);
  const normalized = market ? normalizeMarket(market) : null;
  writeCache(marketCache, marketId, normalized, STATIC_CACHE_TTL_MS);
  return normalized;
}

export async function getMarketFloorPlans(marketId: number) {
  const cached = readCache(floorPlansCache, marketId);
  if (cached) {
    return cached;
  }
  const floorPlans = await request<FloorPlan[]>(`/public/markets/${marketId}/floor-plans`);
  const normalized = floorPlans.map(normalizeFloorPlan);
  writeCache(floorPlansCache, marketId, normalized, STATIC_CACHE_TTL_MS);
  return normalized;
}

export async function getMarketAccessories(marketId: number) {
  const accessories = await request<MarketAccessory[]>(`/public/markets/${marketId}/accessories`);
  return accessories.map(normalizeAccessory);
}

export async function getFloorPlanBooths(floorPlanId: number, date?: string) {
  const booths = await request<Booth[]>(`/public/floor-plans/${floorPlanId}/booths`, {date});
  return booths.map(normalizeBooth);
}

export async function getFloorPlanBoothAvailability(floorPlanId: number, dates: string[]) {
  const cacheKey = `${floorPlanId}:${[...dates].sort().join(',')}`;
  const cached = readCache(boothAvailabilityCache, cacheKey);
  if (cached) {
    return cached;
  }
  const booths = await post<Booth[]>(`/public/floor-plans/${floorPlanId}/booths/availability`, {dates});
  const normalized = booths.map(normalizeBooth);
  writeCache(boothAvailabilityCache, cacheKey, normalized, AVAILABILITY_CACHE_TTL_MS);
  return normalized;
}

export function clearBoothAvailabilityCache() {
  boothAvailabilityCache.clear();
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

export async function holdBoothDates(boothId: number, dates: string[], user: BoothHoldUser) {
  return post<BoothHoldResult>(`/public/booths/${boothId}/hold`, {dates, user});
}

export async function updateBookingSummary(
  bookingId: number,
  user: BoothHoldUser,
  accessories: BookingSummaryAccessoryInput[],
  couponCode = '',
) {
  const summary = await post<BookingSummary>(`/public/bookings/${bookingId}/summary`, {
    user,
    accessories,
    couponCode,
  });
  return normalizeSummary(summary);
}

export async function confirmBooking(bookingId: number, user: BoothHoldUser) {
  const result = await post<BookingConfirmResult>(`/public/bookings/${bookingId}/confirm`, {user});
  return {
    ...result,
    totalAmount: Number(result.totalAmount || 0),
  };
}

export async function getCartBookings(user: BoothHoldUser) {
  const bookings = await post<CartBooking[]>('/public/bookings/cart', {user});
  return bookings.map(normalizeCartBooking);
}
