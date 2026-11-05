import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert} from 'react-native';
import ReservepayCheckoutPanel from '../src/components/payment/ReservepayCheckoutPanel';
import type {ReservepayConfig} from '../src/services/reservepay';
jest.mock('../src/components/payment/useReservepayCheckout', () => ({useReservepayCheckout: () => ({
  state: {phase: 'failed', message: 'ช่องทางนี้รับชำระขั้นต่ำ 20 บาท'}, start: jest.fn(), cancel: jest.fn(),
})}));
test('payment failure uses one Alert and does not render the message as an inline label', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let tree!: renderer.ReactTestRenderer;
  const props = {config: {} as ReservepayConfig, option: {name: 'PROMPTPAY', label: 'PromptPay', icon: 'qrcode', kind: 'qr' as const}, amountBaht: 3, bookingIds: [1], organizationId: 1, user: {email: 'qa@example.test'}, onPaid: jest.fn()};
  act(() => {tree = renderer.create(<ReservepayCheckoutPanel {...props} />);});
  act(() => {tree.update(<ReservepayCheckoutPanel {...props} />);});
  expect(alert).toHaveBeenCalledTimes(1);
  expect(alert).toHaveBeenCalledWith('การชำระเงิน', 'ช่องทางนี้รับชำระขั้นต่ำ 20 บาท', [{text: 'ตกลง'}]);
  expect(JSON.stringify(tree.toJSON())).not.toContain('ขั้นต่ำ 20 บาท');
  act(() => tree.unmount());
  alert.mockRestore();
});
