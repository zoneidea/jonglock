import {getReservepayPaymentStatus, initiateReservepayPayment, type ReservepayAttempt} from '../src/services/reservepay';
jest.mock('../src/services/paymentActivity', () => ({paymentActivity: jest.fn()}));
const attempt = {attemptId: 'RPA1', status: 'unknown'} as ReservepayAttempt;
beforeEach(() => {global.fetch = jest.fn().mockResolvedValue({ok: true, status: 202, json: async () => ({status: 'success', data: attempt})});});
test('initiation uses JWT, stable idempotency key and the strict mobile payload; accepts 202', async () => {
  const body = {bookingIds: [101, 102], paymentSessionId: 'session', amount: '1000'};
  expect(await initiateReservepayPayment('jwt', body, 'same-key')).toEqual(attempt);
  const [url, request] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(/\/mobile\/payments\/reservepay\/initiate$/);
  expect(request.headers.Authorization).toBe('Bearer jwt'); expect(request.headers['Idempotency-Key']).toBe('same-key');
  expect(JSON.parse(request.body)).toEqual(body);
});
test('status uses owned attempt ID rather than arbitrary provider payment ID', async () => {
  await getReservepayPaymentStatus('jwt', 'RPA1');
  const [, request] = (fetch as jest.Mock).mock.calls[0]; expect(JSON.parse(request.body)).toEqual({attemptId: 'RPA1'});
});
