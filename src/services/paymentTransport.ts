import {paymentActivity} from './paymentActivity';

/** A bounded network wait must never be interpreted as a declined/expired payment. */
export async function paymentFetch(url: string, request: RequestInit, endpoint: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const started = Date.now();
  paymentActivity('request', endpoint);
  try {
    const response = await fetch(url, {...request, signal: controller.signal});
    paymentActivity('response', endpoint, response.status, Date.now() - started);
    return response;
  } catch (error) {
    paymentActivity('network_failure', endpoint, 0, Date.now() - started);
    throw error;
  } finally {clearTimeout(timer);}
}
