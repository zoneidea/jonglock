import React, {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Text} from './AppText';
import type {Booth, VisualPlan} from '../services/markets';
import {colors} from '../theme/colors';

const icons: Record<string, string> = {
  entrance:'login',exit:'logout',toilet:'human-male-female',tree:'tree',rest_area:'seat',
  stage:'microphone',parking:'parking',walkway:'walk',road:'road-variant',custom:'shape-outline',
};
const statusColors: Record<string, string> = {
  available:'#14b879',processing:'#f5b93f',booked:'#ef4444',unavailable:'#ef4444',
};

export default function VisualPlanModal({open, layout, booths, onClose, onSelectBooth}: {
  open: boolean;
  layout: VisualPlan | null;
  booths: Booth[];
  onClose: () => void;
  onSelectBooth: (booth: Booth) => void;
}) {
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const [zoom, setZoom] = useState(1);
  const byId = useMemo(() => new Map(booths.map(booth => [Number(booth.id), booth])), [booths]);
  if (!open || !layout) { return null; }
  const cell = Math.max(20, Math.min(44, (width - 32) / layout.columnsCount)) * zoom;
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={[styles.screen, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{layout.name}</Text>
          <Text style={styles.hint}>เลื่อนดูแผนผัง แล้วแตะบูธเพื่อจอง</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="ปิดแผนผังเสมือน" onPress={onClose} style={styles.action}>
          <MaterialCommunityIcons name="close" size={24} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.toolbar}>
        <Text style={styles.legend}>เขียว: ว่าง · เหลือง: ว่างบางวัน · แดง: ไม่ว่าง</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="ย่อแผนผัง" onPress={() => setZoom(value => Math.max(0.75, value - 0.25))} style={styles.action}><Text>−</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="ขยายแผนผัง" onPress={() => setZoom(value => Math.min(2.5, value + 0.25))} style={styles.action}><Text>＋</Text></Pressable>
      </View>
      <ScrollView style={styles.canvasScroll} contentContainerStyle={styles.canvasContent} nestedScrollEnabled>
        <ScrollView horizontal nestedScrollEnabled contentContainerStyle={styles.horizontalContent}>
          <View style={[styles.canvas, {width: layout.columnsCount * cell, height: layout.rowsCount * cell}]}>
            {layout.items.map(item => {
              const booth = item.type === 'booth' ? byId.get(Number(item.boothId)) : undefined;
              const disabled = !booth || ['booked','unavailable'].includes(booth.availabilityStatus);
              const backgroundColor = item.type === 'booth' ? statusColors[booth?.availabilityStatus || ''] || '#CBD5E1'
                : ['road','walkway'].includes(item.type) ? '#E2E8F0' : '#E1F3EF';
              return <Pressable key={item.id} disabled={disabled} accessibilityRole={booth ? 'button' : 'text'}
                accessibilityLabel={booth ? `${booth.code} ${booth.availabilityStatus === 'available' ? 'ว่าง' : booth.availabilityStatus === 'processing' ? 'ว่างบางวัน' : 'ไม่ว่าง'}` : item.label}
                accessibilityState={booth ? {disabled} : undefined}
                onPress={() => { if (booth && !disabled) { onSelectBooth(booth); } }}
                style={[styles.item, {left:(item.col - 1) * cell,top:(item.row - 1) * cell,
                  width:item.colSpan * cell - 2,height:item.rowSpan * cell - 2,backgroundColor}]}>
                {item.type !== 'booth' && icons[item.type] ? <MaterialCommunityIcons name={icons[item.type]} size={Math.min(22, cell * 0.5)} color={colors.tealDark} /> : null}
                <Text style={[styles.itemLabel, item.type === 'booth' && styles.boothLabel]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{booth?.code || item.label}</Text>
              </Pressable>;
            })}
            {!layout.items.length ? <Text style={styles.empty}>ยังไม่มีวัตถุในแผนผังนี้</Text> : null}
          </View>
        </ScrollView>
      </ScrollView>
      <Text style={styles.footer}>สถานะตามวันที่เลือก บูธที่ยังไม่วางในแผนผังเลือกได้จากรายการบูธ</Text>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#FFF'},header:{flexDirection:'row',alignItems:'center',padding:16,gap:12},
  titleWrap:{flex:1},title:{fontSize:18,fontWeight:'700',color:colors.ink},hint:{fontSize:12,color:colors.muted,marginTop:4},
  action:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#EDF7F5'},
  toolbar:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingBottom:12},
  legend:{flex:1,fontSize:11,color:colors.muted},canvasScroll:{flex:1,backgroundColor:'#F1F5F9'},
  canvasContent:{flexGrow:1},horizontalContent:{padding:16},canvas:{position:'relative',backgroundColor:'#FFF'},
  item:{position:'absolute',alignItems:'center',justifyContent:'center',borderRadius:4,overflow:'hidden',padding:2},
  itemLabel:{fontSize:10,textAlign:'center',color:colors.ink},boothLabel:{color:'#FFF',fontWeight:'700'},
  empty:{padding:16,fontSize:13,color:colors.muted},footer:{fontSize:11,color:colors.muted,padding:16,textAlign:'center'},
});
