import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Pressable, StyleSheet} from 'react-native';
import VisualPlanModal from '../src/components/VisualPlanModal';
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
 act(()=>{screen = renderer.create(<VisualPlanModal open layout={layout} booths={booths} onClose={()=>{}} onSelectBooth={onSelect} />);});
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
test('unpublished/missing layout does not render a modal',()=>{
 let screen!:renderer.ReactTestRenderer;
 act(()=>{screen = renderer.create(<VisualPlanModal open layout={null} booths={[]} onClose={()=>{}} onSelectBooth={()=>{}} />);});
 expect(screen.toJSON()).toBeNull(); act(()=>screen.unmount());
});
