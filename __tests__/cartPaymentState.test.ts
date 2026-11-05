import {canModifyCartBooking} from '../src/utils/cartPaymentState';
import {notifyPaymentUpdate, subscribeToPaymentUpdates} from '../src/services/paymentUpdates';
test('pending provider payments remain locked after returning to the cart', () => {
  expect(canModifyCartBooking({status: 'payment_processing'})).toBe(false);
  expect(canModifyCartBooking({status: 'paid'})).toBe(false);
  expect(canModifyCartBooking({status: 'expired'})).toBe(false);
  expect(canModifyCartBooking({status: 'pending_payment'})).toBe(true);
});
test('push updates refresh mounted consumers and clean up subscriptions', () => {
  const refresh = jest.fn();
  const unsubscribe = subscribeToPaymentUpdates(refresh);
  notifyPaymentUpdate();
  expect(refresh).toHaveBeenCalledTimes(1);
  unsubscribe();
  notifyPaymentUpdate();
  expect(refresh).toHaveBeenCalledTimes(1);
});
