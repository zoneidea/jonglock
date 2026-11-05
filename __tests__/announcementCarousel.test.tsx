import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {AccessibilityInfo, AppState, View} from 'react-native';
import AnnouncementCarousel from '../src/components/announcements/AnnouncementCarousel';
import type {Announcement} from '../src/services/announcements';

const items = [1, 2].map(id => ({id, marketName: `ตลาด ${id}`, title: `ข่าว ${id}`, description: 'รายละเอียด', imageUrl: ''} as Announcement));
let tree: renderer.ReactTestRenderer;
let appChange: (state: string) => void;
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appChange = listener as (state: string) => void;
    return {remove: jest.fn()};
  });
});
afterEach(() => {act(() => tree?.unmount()); jest.restoreAllMocks(); jest.useRealTimers();});
async function mount(onPress = jest.fn()) {
  await act(async () => {tree = renderer.create(<AnnouncementCarousel items={items} onPress={onPress} />);});
  act(() => {tree.root.findAllByType(View)[0].props.onLayout({nativeEvent: {layout: {width: 360}}});});
  return onPress;
}
function dot(position: number) {return tree.root.findAll(node => node.props.accessibilityLabel === `แบนเนอร์ ${position} จาก 2` && node.props.onPress)[0];}
test('advances after five seconds, respects pause and opens the selected market', async () => {
  const onPress = await mount();
  expect(dot(1).props.accessibilityState.selected).toBe(true);
  await act(async () => {await jest.advanceTimersByTimeAsync(5000);});
  expect(dot(2).props.accessibilityState.selected).toBe(true);
  const pause = tree.root.findAll(node => node.props.accessibilityLabel === 'หยุดเลื่อนแบนเนอร์ชั่วคราว' && node.props.onPress)[0];
  act(() => pause.props.onPress());
  await act(async () => {await jest.advanceTimersByTimeAsync(15000);});
  expect(dot(2).props.accessibilityState.selected).toBe(true);
  const card = tree.root.findAll(node => node.props.accessibilityLabel === 'ตลาด 2: ข่าว 2' && node.props.onPress)[0];
  act(() => card.props.onPress());
  expect(onPress).toHaveBeenCalledWith(items[1]);
});
test('does not auto-slide while app is backgrounded', async () => {
  await mount();
  act(() => appChange('background'));
  await act(async () => {await jest.advanceTimersByTimeAsync(10000);});
  expect(dot(1).props.accessibilityState.selected).toBe(true);
});
test('reduced motion disables automatic sliding', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await mount();
  await act(async () => {await jest.advanceTimersByTimeAsync(10000);});
  expect(dot(1).props.accessibilityState.selected).toBe(true);
});
