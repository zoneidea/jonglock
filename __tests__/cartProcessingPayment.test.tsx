import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Pressable, Text} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CartScreen from '../src/screens/CartScreen';
import {getCartBookings, getCartPaymentInfo, type CartBooking, type BookingPaymentInfo} from '../src/services/markets';
import {getReservepayConfig} from '../src/services/reservepay';
jest.mock('../src/theme/theme', () => ({useTheme: () => ({palette: {text: '#07111f', muted: '#607086', background: '#fff', surface: '#fff', border: '#dbe7ef', accent: '#14a997', accentDark: '#087b70'}})}));
jest.mock('../src/notice/NoticeProvider', () => {
  const notices = {showError: jest.fn(), showWarning: jest.fn(), showSuccess: jest.fn()};
  return {useNotice: () => notices};
});
jest.mock('../src/services/reservepay', () => ({getReservepayConfig: jest.fn(async () => ({checkoutEnabled: true, methods: [{name: 'PROMPTPAY', displayName: 'PromptPay QR', category: 'QR', flow: 'QR'}]}))}));
jest.mock('../src/services/markets', () => ({getCartPaymentInfo: jest.fn(), getCartBookings: jest.fn(async () => [{bookingId: 1, organizationId: 7, marketId: 33, marketName: 'ตลาดกล้วย', publicId: 'BK1', status: 'payment_processing', totalAmount: 44, items: [], accessories: []}])}));
test('returning to a cart with a pending QR exposes neither checkout nor delete and cannot select the row', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {tree = renderer.create(<CartScreen user={{email: 'test@example.test', name: 'Test', provider: 'gmail'}} />);});
  const row = tree.root.findAllByType(Pressable).find(node => node.props.accessibilityState?.disabled === true)!;
  expect(row.props.disabled).toBe(true);
  act(() => row.props.onPress());
  expect(tree.root.findAllByType(Text).some(node => node.props.children === 'ดำเนินการชำระเงิน')).toBe(false);
  expect(tree.root.findAllByType(MaterialCommunityIcons).some(node => node.props.name === 'trash-can-outline')).toBe(false);
  act(() => tree.unmount());
});

async function checkoutWithMode(mode: 'manual' | 'gateway') {
  const bookings = [33, 34].map((marketId, index) => ({bookingId: index + 1, organizationId: 7, marketId, marketName: `Market ${marketId}`, publicId: `BK${index}`, status: 'pending_payment', expiresAt: new Date(Date.now() + 600000).toISOString(), totalAmount: 44, items: [], accessories: []} as unknown as CartBooking));
  jest.mocked(getCartBookings).mockResolvedValue(bookings);
  jest.mocked(getCartPaymentInfo).mockResolvedValue({paymentMode: mode, paymentSettingsScope: 'organization', paymentMethod: mode === 'manual' ? {bankAccountNo: '1234567890', bankAccountName: 'Organization'} : {}} as unknown as BookingPaymentInfo);
  jest.mocked(getReservepayConfig).mockClear();
  jest.mocked(getCartPaymentInfo).mockClear();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {tree = renderer.create(<CartScreen user={{email: 'test@example.test', name: 'Test', provider: 'gmail'}} />);});
  const rows = tree.root.findAllByType(Pressable).filter(node => node.props.accessibilityState?.disabled === false);
  expect(rows).toHaveLength(2);
  act(() => rows.forEach(row => row.props.onPress()));
  const button = (label: string) => tree.root.findAllByType(Pressable).find(node => node.findAllByType(Text).some(text => text.props.children === label))!;
  act(() => button('ดำเนินการชำระเงิน').props.onPress());
  await act(async () => button('ยืนยันชำระเงิน').props.onPress());
  return tree;
}
test('two markets share organization manual settings and do not request gateway methods', async () => {
  const tree = await checkoutWithMode('manual');
  try {
  const labels = tree.root.findAllByType(Text).map(node => node.props.children);
  expect(labels).toContain('Organization');
  expect(labels).toContain('1234567890');
  expect(labels).not.toContain('PromptPay QR');
  expect(getReservepayConfig).not.toHaveBeenCalled();
  } finally {act(() => tree.unmount());}
});
test('organization gateway settings hide manual transfer for every selected market', async () => {
  const tree = await checkoutWithMode('gateway');
  try {
  const labels = tree.root.findAllByType(Text).map(node => node.props.children);
  expect(labels).toContain('PromptPay QR');
  expect(labels).not.toContain('โอนเงินเข้าบัญชีตลาด / แนบสลิป');
  expect(labels).not.toContain('1234567890');
  } finally {act(() => tree.unmount());}
});
