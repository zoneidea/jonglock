import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {FlatList, Modal, Pressable} from 'react-native';
import BoothSelectionStep from '../src/screens/booking/BoothSelectionStep';
import VisualPlanView from '../src/components/VisualPlanView';
import {getPublishedVisualPlan, type Market, type FloorPlan} from '../src/services/markets';

jest.mock('../src/theme/theme', () => ({useTheme: () => ({palette: {text:'#07111f', muted:'#607086', background:'#fff', surface:'#fff', border:'#dbe7ef', accent:'#14a997'}})}));

jest.mock('../src/notice/NoticeProvider', () => {
  const notice = {showError: jest.fn(), showWarning: jest.fn()};
  return {useNotice: () => notice};
});
jest.mock('../src/services/markets', () => ({
  getPublishedVisualPlan: jest.fn(),
  getFloorPlanBoothAvailability: jest.fn(async () => [{id:10, code:'A01', status:'active', availabilityStatus:'available', availabilityDates:[]}]),
}));
jest.mock('../src/services/boothTempLocks', () => ({
  subscribeFloorPlanTempLocks: () => () => {},
  tempLockKey: (id: number, date: string) => `${id}:${date}`,
}));

const plan = {id:1, name:'Plan', rowsCount:20, columnsCount:30, items:[{id:'a', type:'booth', boothId:10, row:1, col:1, rowSpan:1, colSpan:1}]};
const props = {
  market: {id:9, name:'Market'} as Market,
  markets: [], floorPlans: [],
  floorPlan: {id:5, marketId:9, name:'Zone'} as FloorPlan,
  selectedDates: ['2026-11-07'], user:null,
  onBack:jest.fn(), onSelectMarket:jest.fn(), onSelectFloorPlan:jest.fn(), onChangeDates:jest.fn(), onReserved:jest.fn(),
};

test('switches between the same booth grid and inline map, opens details without reserving', async () => {
  (getPublishedVisualPlan as jest.Mock).mockResolvedValue(plan);
  let screen!: renderer.ReactTestRenderer;
  await act(async () => {screen = renderer.create(<BoothSelectionStep {...props} />);});
  const list = () => screen.root.findAllByType(FlatList)[0];
  const tabs = () => screen.root.findAllByType(Pressable).filter(node => node.props.accessibilityRole === 'tab');
  expect(list().props.data).toHaveLength(1);
  act(() => tabs()[1].props.onPress());
  expect(list().props.data).toHaveLength(0);
  const map = screen.root.findByType(VisualPlanView);
  expect(map.props.booths[0].id).toBe(10);
  act(() => map.props.onSelectBooth(map.props.booths[0]));
  expect(props.onReserved).not.toHaveBeenCalled();
  expect(screen.root.findAllByType(Modal).filter(node => node.props.visible)).toHaveLength(1);
  act(() => tabs()[0].props.onPress());
  expect(list().props.data[0].id).toBe(10);
  expect(screen.root.findAllByType(VisualPlanView)).toHaveLength(0);
  act(() => screen.unmount());
});

test('keeps the regular grid when no published visual plan exists', async () => {
  (getPublishedVisualPlan as jest.Mock).mockResolvedValue(null);
  let screen!: renderer.ReactTestRenderer;
  await act(async () => {screen = renderer.create(<BoothSelectionStep {...props} />);});
  expect(screen.root.findAllByType(Pressable).filter(node => node.props.accessibilityRole === 'tab')).toHaveLength(0);
  expect(screen.root.findAllByType(FlatList)[0].props.data).toHaveLength(1);
  act(() => screen.unmount());
});
