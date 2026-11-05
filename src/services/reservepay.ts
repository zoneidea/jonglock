// ReservePay payment gateway (custom UI flow).
// Docs: https://developer.reservepay.com/guides/accept-payments-using-your-own-ui
//
// - Public SDK endpoints (merchant_id + installation_id, no secret) are called directly from the app.
// - Anything that needs the secret API key goes through the Jonglock backend
//   (/mobile/payments/reservepay/* with a customer JWT). Configuration is public.
//   NEVER put the ReservePay API key in this app.
import {Platform} from 'react-native';

import {API_BASE_URL} from '../config/api';
import {paymentFetch} from './paymentTransport';

const SDK_BASE_URL = 'https://api.reservepay.com/sdk';
const API_VERSION = '2025-04-01';

/** Where ReservePay sends the customer after a redirect flow (mobile banking, wallets, 3DS). */
export const RESERVEPAY_RETURN_URL = 'jonglock://payment-return';

export type ReservepayMethod = {
  name: string;
  displayName: string;
  category: string;
  flow: string;
};

export type ReservepayConfig = {
  merchantId: string;
  installationId: string;
  platform: 'IOS' | 'ANDROID';
  installationEnabled: boolean;
  checkoutEnabled: boolean;
  emailCapture: 'disabled' | 'optional' | 'required';
  mobileCapture: 'disabled' | 'optional' | 'required';
  addressCapture: 'disabled' | 'optional' | 'required';
  methods: ReservepayMethod[];
};

export type ReservepayNextAction = 'WAIT' | 'DISPLAY_QR' | 'REDIRECT' | 'CHECK_STATUS';
export type ReservepayStatus = 'PENDING' | 'INITIATED' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';

export class ReservepayError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.code = code;
  }
}

type ApiResponse<T> = {status: string; message: string; data: T};

async function backendPost<T>(path: string, body: object, token?: string, idempotencyKey?: string): Promise<T> {
  const prefix = token ? 'mobile' : 'public';
  const response = await paymentFetch(`${API_BASE_URL}/${prefix}/payments/reservepay${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {}), ...(idempotencyKey ? {'Idempotency-Key': idempotencyKey} : {})},
    body: JSON.stringify(body),
  }, path);
  const payload = (await response.json().catch(() => null)) as (ApiResponse<T> & {code?: string}) | null;
  if (!response.ok || !payload) {
    throw new ReservepayError(payload?.code || `HTTP_${response.status}`, payload?.message || 'ไม่สามารถเชื่อมต่อระบบชำระเงินได้');
  }
  return payload.data;
}

async function sdkPost<T>(endpoint: string, config: ReservepayConfig, body: object = {}): Promise<T> {
  const response = await paymentFetch(`${SDK_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Api-Version': API_VERSION,
    },
    body: JSON.stringify({
      merchant_id: config.merchantId,
      installation_id: config.installationId,
      ...body,
    }),
  }, endpoint);
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    // Error responses are JSON arrays of error objects, e.g. [{code: 'NOT_READY'}].
    const first = Array.isArray(json) ? json[0] : json;
    throw new ReservepayError(typeof first === 'string' ? first : first?.code || `HTTP_${response.status}`, typeof first === 'string' ? undefined : first?.message);
  }
  return json as T;
}

/** Baht -> satang string (smallest currency unit), without float drift. */
export function toMinorUnits(amountBaht: number) {
  return String(Math.round(Number(amountBaht || 0) * 100));
}

// ---------- Backend (secret key stays on the server) ----------

export function getReservepayConfig() {
  const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  return backendPost<ReservepayConfig>('/methods', {platform});
}

export type ReservepayAttempt = {
  attemptId: string;
  paymentId: string | null;
  paymentSessionId: string;
  paymentMethod: string | null;
  status: 'creating' | 'pending' | 'unknown' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'review';
  providerStatus: string | null;
  failureCode?: 'AMOUNT_BELOW_MINIMUM';
  minimumAmount?: string;
  amount: string;
};

export type ReservepayInitiation = {
  bookingIds: number[];
  paymentSessionId: string;
  amount: string;
};

export function initiateReservepayPayment(token: string, args: ReservepayInitiation, key: string) {
  return backendPost<ReservepayAttempt>('/initiate', args, token, key);
}

export function getReservepayPaymentStatus(token: string, attemptId: string) {
  return backendPost<ReservepayAttempt>('/status', {attemptId}, token);
}

export function getActiveReservepayAttempt(token: string, bookingIds: number[]) {
  return backendPost<{attempt: ReservepayAttempt | null}>('/active', {bookingIds}, token);
}

// ---------- Public SDK endpoints ----------

export function selectPaymentMethod(
  config: ReservepayConfig,
  args: {amount: string; paymentMethod: string; customerEmail?: string; customerName?: string; token?: string},
) {
  return sdkPost<string>('select-payment-method', config, {
    amount: args.amount,
    currency: 'THB',
    payment_method: args.paymentMethod,
    customer_language: 'th',
    ...(args.customerEmail && config.emailCapture !== 'disabled' ? {customer_email: args.customerEmail} : {}),
    ...(args.customerName ? {customer_name: args.customerName} : {}),
    ...(args.token ? {token: args.token} : {}),
  });
}

export function discoverNextAction(config: ReservepayConfig, paymentSessionId: string) {
  return sdkPost<ReservepayNextAction>('discover-next-action', config, {payment_session_id: paymentSessionId});
}

/** Returns the decoded QR payload (the API sends it Base64-encoded). */
export async function retrieveQrData(config: ReservepayConfig, paymentSessionId: string) {
  const encoded = await sdkPost<string>('retrieve-qr-data', config, {payment_session_id: paymentSessionId});
  return atob(encoded);
}

export function getRedirectUrl(config: ReservepayConfig, paymentSessionId: string) {
  return sdkPost<string | null>('get-redirect-url', config, {payment_session_id: paymentSessionId});
}

export function checkStatus(config: ReservepayConfig, paymentSessionId: string) {
  return sdkPost<ReservepayStatus>('check-status', config, {payment_session_id: paymentSessionId});
}

export function retrievePaymentSession(config: ReservepayConfig, paymentSessionId: string) {
  return sdkPost<{expires_at?: number | null}>('retrieve-payment-session', config, {payment_session_id: paymentSessionId});
}
