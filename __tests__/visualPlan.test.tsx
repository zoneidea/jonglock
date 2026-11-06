import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import VisualPlanView from '../src/components/VisualPlanView';
import type {Booth, VisualPlan} from '../src/services/markets';
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top:62,bottom:34,left:0,right:0})}));
const layout: VisualPlan = {id:1,marketId:9,floorPlanId:5,name:'Plan',rowsCount:2,columnsCount:3,updatedAt:'2026-11-06',items:[
 {id:'a',type:'booth',boothId:10,label:'A01',row:1,col:1,rowSpan:1,colSpan:1},
 {id:'b',type:'booth',boothId:11,label:'A02',row:1,col:2,rowSpan:1,colSpan:1},
 {id:'c',type:'booth',boothId:99,label:'Other',row:2,col:1,rowSpan:1,colSpan:1},
]};
const booths = [{id:10,code:'A01',availabilityStatus:'available'},{id:11,code:'A02',availabilityStatus:'booked'}] as Booth[];
test('map selects the real available booth and disables booked or unmatched booths',()=>{
 const onSelect = jest.fn(); let screen!:renderer.ReactTestRenderer;
 act(()=>{screen = renderer.create(<VisualPlanView layout={layout} booths={booths} onSelectBooth={onSelect} />);});
 const buttons = screen.root.findAllByType(Pressable);
 const available = buttons.find(b=>b.props.accessibilityLabel === 'A01 ว่าง')!;
 expect(available.props.disabled).toBe(false);
 act(()=>available.props.onPress()); expect(onSelect).toHaveBeenCalledWith(booths[0]);
 expect(buttons.find(b=>b.props.accessibilityLabel === 'A02 ไม่ว่าง')!.props.disabled).toBe(true);
 const unknown = buttons.find(b=>b.props.accessibilityLabel === 'Other')!;
 expect(unknown.props.disabled).toBe(true);
 expect(StyleSheet.flatten(available.props.style).left).toBe(0);
 act(()=>screen.unmount());
});
test.each([240, 360, 768])('fits a 30-column plan into a %s-point container and restores fit after zoom', width => {
 let screen!: renderer.ReactTestRenderer;
 act(() => {screen = renderer.create(<VisualPlanView layout={{...layout, rowsCount:20, columnsCount:30, items:[]}} booths={booths} onSelectBooth={jest.fn()} />);});
 const host = screen.root.findAllByType(View).find(node => node.props.onLayout)!;
 act(() => host.props.onLayout({nativeEvent:{layout:{width}}}));
 const canvas = () => StyleSheet.flatten(screen.root.findByProps({testID:'visual-plan-canvas'}).props.style);
 const fitWidth = canvas().width;
 expect(fitWidth).toBeLessThanOrEqual(width - 24);
 expect(canvas().height / fitWidth).toBeCloseTo(20 / 30);
 act(() => screen.root.findAllByType(Pressable).find(node => node.props.accessibilityLabel === 'ขยายแผนผัง')!.props.onPress());
 expect(canvas().width).toBeGreaterThan(fitWidth);
 act(() => screen.root.findAllByType(Pressable).find(node => node.props.accessibilityLabel === 'ปรับแผนผังพอดีจอ')!.props.onPress());
 expect(canvas().width).toBe(fitWidth);
 expect(screen.root.findAllByType(Modal)).toHaveLength(0);
 act(() => screen.unmount());
});

test('trims unused grid space while preserving relative object positions', () => {
 let screen!: renderer.ReactTestRenderer;
 const offsetItems = layout.items.map(item => ({...item, row:item.row + 5, col:item.col + 10}));
 act(() => {screen = renderer.create(<VisualPlanView layout={{...layout, rowsCount:20, columnsCount:30, items:offsetItems}} booths={booths} onSelectBooth={jest.fn()} />);});
 const canvas = StyleSheet.flatten(screen.root.findByProps({testID:'visual-plan-canvas'}).props.style);
 // Two occupied columns/rows plus one-cell margin on every side.
 expect(canvas.width / canvas.height).toBeCloseTo(1);
 const buttons = screen.root.findAllByType(Pressable);
 const first = StyleSheet.flatten(buttons.find(node => node.props.accessibilityLabel === 'A01 ว่าง')!.props.style);
 const second = StyleSheet.flatten(buttons.find(node => node.props.accessibilityLabel === 'A02 ไม่ว่าง')!.props.style);
 expect(first.left).toBeCloseTo(canvas.width / 4);
 expect(second.left - first.left).toBeCloseTo(canvas.width / 4);
 act(() => screen.unmount());
});
