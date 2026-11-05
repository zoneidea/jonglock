import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Pressable} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BookingSummaryStep from '../src/screens/booking/BookingSummaryStep';
import {updateBookingSummary, type Market, type FloorPlan, type Booth, type BoothHoldResult} from '../src/services/markets';
jest.mock('../src/theme/theme', () => ({useTheme: () => ({palette: {text: '#07111f', muted: '#607086', background: '#fff', surface: '#fff', border: '#dbe7ef', accent: '#14a997', accentDark: '#087b70'}})}));
jest.mock('../src/notice/NoticeProvider', () => {
  const notices = {showError: jest.fn(), showWarning: jest.fn()};
  return {useNotice: () => notices};
});
jest.mock('../src/services/markets', () => ({
  getMarketAccessories: jest.fn(async () => [{id: 1, name: 'ปลั๊กไฟ', stockQuantity: 1, price: 10}]),
  updateBookingSummary: jest.fn(async () => ({status: 'pending_payment', items: [], accessories: [], totalAmount: 44})),
}));
test('accessory quantity cannot exceed API stock before requesting a new summary', async () => {
  jest.useFakeTimers();
  const user = {email: 'test@example.test', name: 'Test', provider: 'gmail' as const};
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {tree = renderer.create(<BookingSummaryStep user={user}
    market={{id: 33, name: 'ตลาดกล้วย'} as Market} floorPlan={{name: 'A'} as FloorPlan}
    booth={{code: 'B001'} as Booth} hold={{bookingId: 1, publicId: 'BK1', unavailableDates: [], lockedDates: []} as unknown as BoothHoldResult}
    onBack={jest.fn()} />);});
  const plus = () => tree.root.findAllByType(Pressable).find(node => node.findAllByType(MaterialCommunityIcons).some(icon => icon.props.name === 'plus'))!;
  act(() => plus().props.onPress());
  expect(plus().props.disabled).toBe(true);
  // The callback also clamps quantity if triggered programmatically before disabled propagates.
  act(() => plus().props.onPress());
  await act(async () => {await jest.advanceTimersByTimeAsync(300);});
  expect(updateBookingSummary).toHaveBeenLastCalledWith(1, {email: user.email, name: user.name}, [{accessoryId: 1, quantity: 1}], '');
  act(() => tree.unmount());
  jest.useRealTimers();
});
