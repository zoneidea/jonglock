import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Pressable, Text} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CartScreen from '../src/screens/CartScreen';
jest.mock('../src/theme/theme', () => ({useTheme: () => ({palette: {text: '#07111f', muted: '#607086', background: '#fff', surface: '#fff', border: '#dbe7ef', accent: '#14a997', accentDark: '#087b70'}})}));
jest.mock('../src/notice/NoticeProvider', () => {
  const notices = {showError: jest.fn(), showWarning: jest.fn(), showSuccess: jest.fn()};
  return {useNotice: () => notices};
});
jest.mock('../src/services/markets', () => ({getCartBookings: jest.fn(async () => [{bookingId: 1, organizationId: 7, marketId: 33, marketName: 'ตลาดกล้วย', publicId: 'BK1', status: 'payment_processing', totalAmount: 44, items: [], accessories: []}])}));
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
