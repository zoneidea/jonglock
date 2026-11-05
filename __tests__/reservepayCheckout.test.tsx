import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {AppState} from 'react-native';
import {useReservepayCheckout} from '../src/components/payment/useReservepayCheckout';
import {paymentAccessToken} from '../src/services/paymentAuth';
import * as gateway from '../src/services/reservepay';
import type {ReservepayAttempt, ReservepayConfig} from '../src/services/reservepay';
jest.mock('../src/services/paymentAuth', () => ({paymentAccessToken: jest.fn(async () => 'jwt')}));
jest.mock('../src/services/paymentActivity', () => ({paymentActivity: jest.fn()}));
jest.mock('../src/services/reservepay', () => ({...jest.requireActual('../src/services/reservepay'),
  selectPaymentMethod: jest.fn(), initiateReservepayPayment: jest.fn(), getActiveReservepayAttempt: jest.fn(),
  getReservepayPaymentStatus: jest.fn(), discoverNextAction: jest.fn(),
}));
let checkout: ReturnType<typeof useReservepayCheckout>;
let tree: renderer.ReactTestRenderer;
function Harness() {checkout = useReservepayCheckout(); return null;}
const pending = {attemptId: 'RPA1', paymentId: 'provider', paymentSessionId: 'session', status: 'pending'} as ReservepayAttempt;
const args = {config: {} as ReservepayConfig, paymentMethod: 'PROMPTPAY', amountBaht: 10, bookingIds: [101], organizationId: 7, user: {email: 'buyer@example.test'}, onSuccess: jest.fn()};
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); Object.defineProperty(AppState, 'currentState', {configurable: true, value: 'active'});
  jest.mocked(gateway.getActiveReservepayAttempt).mockResolvedValue({attempt: null});
  jest.mocked(gateway.selectPaymentMethod).mockResolvedValue('session');
  jest.mocked(gateway.initiateReservepayPayment).mockResolvedValue(pending);
  jest.mocked(gateway.discoverNextAction).mockResolvedValue('CHECK_STATUS');
  act(() => {tree = renderer.create(<Harness />);});
});
afterEach(() => {act(() => tree.unmount()); jest.useRealTimers();});
test('SDK completion never marks paid until backend reports paid', async () => {
  jest.mocked(gateway.getReservepayPaymentStatus).mockResolvedValueOnce(pending).mockResolvedValue({...pending, status: 'paid'});
  await act(async () => {void checkout.start(args);}); expect(args.onSuccess).not.toHaveBeenCalled();
  await act(async () => {await jest.advanceTimersByTimeAsync(3000);}); expect(args.onSuccess).toHaveBeenCalledTimes(1);
});
test('resumes owned active attempt without generating a new SDK session or initiating again', async () => {
  jest.mocked(gateway.getActiveReservepayAttempt).mockResolvedValue({attempt: pending});
  jest.mocked(gateway.getReservepayPaymentStatus).mockResolvedValue({...pending, status: 'paid'});
  await act(async () => {await checkout.start(args);});
  expect(gateway.selectPaymentMethod).not.toHaveBeenCalled(); expect(gateway.initiateReservepayPayment).not.toHaveBeenCalled();
  expect(args.onSuccess).toHaveBeenCalledTimes(1);
});
test('lost initiate response retries identical session, body and key', async () => {
  jest.mocked(gateway.initiateReservepayPayment).mockRejectedValueOnce(new TypeError('network')).mockResolvedValue(pending);
  jest.mocked(gateway.getReservepayPaymentStatus).mockResolvedValue({...pending, status: 'paid'});
  await act(async () => {void checkout.start(args);});
  await act(async () => {await jest.advanceTimersByTimeAsync(1500);});
  const calls = jest.mocked(gateway.initiateReservepayPayment).mock.calls;
  expect(calls).toHaveLength(2); expect(calls[0]).toEqual(calls[1]); expect(gateway.selectPaymentMethod).toHaveBeenCalledTimes(1);
});
test('unknown state and local timeout remain waiting, never expired or successful', async () => {
  const unknown = {...pending, paymentId: null, status: 'unknown'} as ReservepayAttempt;
  jest.mocked(gateway.getActiveReservepayAttempt).mockResolvedValue({attempt: unknown});
  jest.mocked(gateway.getReservepayPaymentStatus).mockResolvedValue(unknown);
  await act(async () => {void checkout.start(args);});
  await act(async () => {await jest.advanceTimersByTimeAsync(600005);});
  expect(checkout.state.phase).toBe('waiting'); expect(args.onSuccess).not.toHaveBeenCalled();
  expect(gateway.selectPaymentMethod).not.toHaveBeenCalled();
});
test('provider minimum is explained without changing the booking amount or marking it paid', async () => {
  jest.mocked(gateway.getActiveReservepayAttempt).mockResolvedValue({attempt: pending});
  jest.mocked(gateway.getReservepayPaymentStatus).mockResolvedValue({...pending, status: 'failed', failureCode: 'AMOUNT_BELOW_MINIMUM', minimumAmount: '2000'});
  await act(async () => {await checkout.start({...args, amountBaht: 3});});
  expect(checkout.state.phase).toBe('failed');
  expect(checkout.state.message).toContain('ขั้นต่ำ 20 บาท');
  expect(args.onSuccess).not.toHaveBeenCalled();
});
test('expired customer JWT is renewed silently and resumes the same payment attempt', async () => {
  jest.mocked(paymentAccessToken).mockResolvedValueOnce('initial-jwt').mockResolvedValueOnce('renewed-jwt');
  jest.mocked(gateway.getActiveReservepayAttempt).mockResolvedValue({attempt: pending});
  jest.mocked(gateway.getReservepayPaymentStatus).mockRejectedValueOnce(new gateway.ReservepayError('UNAUTHORIZED'))
    .mockResolvedValue({...pending, status: 'paid'});
  await act(async () => {await checkout.start(args);});
  expect(gateway.getReservepayPaymentStatus).toHaveBeenNthCalledWith(1, 'initial-jwt', pending.attemptId);
  expect(gateway.getReservepayPaymentStatus).toHaveBeenNthCalledWith(2, 'renewed-jwt', pending.attemptId);
  expect(gateway.initiateReservepayPayment).not.toHaveBeenCalled();
  expect(gateway.selectPaymentMethod).not.toHaveBeenCalled();
  expect(args.onSuccess).toHaveBeenCalledTimes(1);
});
test('authorization retry during initiation retains the exact body and idempotency key', async () => {
  jest.mocked(paymentAccessToken).mockResolvedValueOnce('initial-jwt').mockResolvedValueOnce('renewed-jwt');
  jest.mocked(gateway.initiateReservepayPayment).mockRejectedValueOnce(new gateway.ReservepayError('UNAUTHORIZED')).mockResolvedValue(pending);
  jest.mocked(gateway.getReservepayPaymentStatus).mockResolvedValue({...pending, status: 'paid'});
  await act(async () => {await checkout.start({...args, bookingIds: [102]});});
  const calls = jest.mocked(gateway.initiateReservepayPayment).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[0][0]).toBe('initial-jwt');
  expect(calls[1][0]).toBe('renewed-jwt');
  expect(calls[1].slice(1)).toEqual(calls[0].slice(1));
  expect(gateway.selectPaymentMethod).toHaveBeenCalledTimes(1);
  expect(args.onSuccess).toHaveBeenCalledTimes(1);
});
