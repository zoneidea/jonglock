import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Pressable, Text} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import OfflineScreen from '../src/screens/OfflineScreen';

const mockWarning = jest.fn();
const mockError = jest.fn();
jest.mock('../src/notice/NoticeProvider', () => ({
  useNotice: () => ({showWarning: mockWarning, showError: mockError}),
}));
jest.mock('../src/theme/theme', () => ({
  useTheme: () => ({resolvedTheme: 'light', palette: {background: '#fff', text: '#000', muted: '#777', accent: '#087', inverseText: '#fff', danger: '#f00'}}),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 62, bottom: 34, left: 0, right: 0}),
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {refresh: jest.fn(), fetch: jest.fn()},
}));

let screen: renderer.ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  act(() => { screen = renderer.create(<OfflineScreen />); });
});
afterEach(() => {
  act(() => screen.unmount());
  jest.useRealTimers();
});

function retryButton() { return screen.root.findByType(Pressable); }

test('offline retry shows an Alert and restores the button instead of silently doing nothing', async () => {
  (NetInfo.refresh as jest.Mock).mockResolvedValue({isConnected: false, isInternetReachable: false});
  await act(async () => { await retryButton().props.onPress(); });
  expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('Wi-Fi'), 'ยังออฟไลน์');
  expect(retryButton().props.disabled).toBe(false);
  expect(NetInfo.fetch).not.toHaveBeenCalled();
});

test('pending retry shows progress and coalesces repeated taps', async () => {
  let complete!: (state: object) => void;
  (NetInfo.refresh as jest.Mock).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = retryButton().props.onPress(); });
  expect(retryButton().props.disabled).toBe(true);
  expect(screen.root.findAllByType(Text).some(node => node.props.children === 'กำลังตรวจสอบ…')).toBe(true);
  await act(async () => { await retryButton().props.onPress(); });
  expect(NetInfo.refresh).toHaveBeenCalledTimes(1);
  await act(async () => { complete({isConnected: true, isInternetReachable: true}); await pending; });
  expect(mockWarning).not.toHaveBeenCalled();
  expect(mockError).not.toHaveBeenCalled();
  expect(retryButton().props.disabled).toBe(false);
});

test('unknown reachability reports that checking is incomplete', async () => {
  (NetInfo.refresh as jest.Mock).mockResolvedValue({isConnected: true, isInternetReachable: null});
  await act(async () => { await retryButton().props.onPress(); });
  expect(mockWarning).toHaveBeenCalledWith(expect.any(String), 'กำลังตรวจสอบเครือข่าย');
});

test('network check rejection reports an Alert and permits another retry', async () => {
  (NetInfo.refresh as jest.Mock).mockRejectedValue(new Error('native failure'));
  await act(async () => { await retryButton().props.onPress(); });
  expect(mockError).toHaveBeenCalledTimes(1);
  expect(retryButton().props.disabled).toBe(false);
});

test('a hung network check times out after ten seconds and releases the button', async () => {
  jest.useFakeTimers();
  (NetInfo.refresh as jest.Mock).mockImplementation(() => new Promise(() => {}));
  let pending!: Promise<void>;
  act(() => { pending = retryButton().props.onPress(); });
  await act(async () => { jest.advanceTimersByTime(10000); await pending; });
  expect(mockError).toHaveBeenCalledTimes(1);
  expect(retryButton().props.disabled).toBe(false);
});
