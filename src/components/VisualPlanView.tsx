import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View, useWindowDimensions} from 'react-native';
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

export default function VisualPlanView({layout, booths, onSelectBooth}: {
  layout: VisualPlan;
  booths: Booth[];
  onSelectBooth: (booth: Booth) => void;
}) {
  const {width, height} = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const byId = useMemo(() => new Map(booths.map(booth => [Number(booth.id), booth])), [booths]);
  const bounds = useMemo(() => {
    if (!layout.items.length) {
      return {left:0, top:0, columns:layout.columnsCount, rows:layout.rowsCount};
    }
    const left = Math.max(0, Math.min(...layout.items.map(item => item.col - 1)) - 1);
    const top = Math.max(0, Math.min(...layout.items.map(item => item.row - 1)) - 1);
    const right = Math.min(layout.columnsCount, Math.max(...layout.items.map(item => item.col - 1 + item.colSpan)) + 1);
    const bottom = Math.min(layout.rowsCount, Math.max(...layout.items.map(item => item.row - 1 + item.rowSpan)) + 1);
    return {left, top, columns:right - left, rows:bottom - top};
  }, [layout]);
  const availableWidth = Math.max(1, (measuredWidth ?? width - 40) - 24);
  const maxHeight = Math.max(180, Math.min(480, height * 0.45));
  const fitCell = Math.min(availableWidth / bounds.columns, maxHeight / bounds.rows);
  const cell = fitCell * zoom;
  return <View style={styles.screen} onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)}>
      <Text style={styles.title}>{layout.name}</Text>
      <View style={styles.toolbar}>
        <Text style={styles.legend}>แตะบูธเพื่อดูรายละเอียด</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="ปรับแผนผังพอดีจอ" onPress={() => setZoom(1)} style={styles.fitAction}><Text style={styles.fitLabel}>พอดีจอ</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="ย่อแผนผัง" onPress={() => setZoom(value => Math.max(1, value - 0.5))} style={styles.action}><Text>−</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="ขยายแผนผัง" onPress={() => setZoom(value => Math.min(4, value + 0.5))} style={styles.action}><Text>＋</Text></Pressable>
      </View>
      <ScrollView style={[styles.canvasScroll, {height: bounds.rows * fitCell + 24}]} contentContainerStyle={styles.canvasContent} nestedScrollEnabled>
        <ScrollView horizontal nestedScrollEnabled contentContainerStyle={styles.horizontalContent}>
          <View testID="visual-plan-canvas" style={[styles.canvas, {width: bounds.columns * cell, height: bounds.rows * cell}]}>
            {layout.items.map(item => {
              const booth = item.type === 'booth' ? byId.get(Number(item.boothId)) : undefined;
              const disabled = !booth || ['booked','unavailable'].includes(booth.availabilityStatus);
              const backgroundColor = item.type === 'booth' ? statusColors[booth?.availabilityStatus || ''] || '#CBD5E1'
                : ['road','walkway'].includes(item.type) ? '#E2E8F0' : '#E1F3EF';
              return <Pressable key={item.id} disabled={disabled} accessibilityRole={booth ? 'button' : 'text'}
                accessibilityLabel={booth ? `${booth.code} ${booth.availabilityStatus === 'available' ? 'ว่าง' : booth.availabilityStatus === 'processing' ? 'ว่างบางวัน' : 'ไม่ว่าง'}` : item.label}
                accessibilityState={booth ? {disabled} : undefined}
                onPress={() => { if (booth && !disabled) { onSelectBooth(booth); } }}
                style={[styles.item, {left:(item.col - 1 - bounds.left) * cell,top:(item.row - 1 - bounds.top) * cell,
                  width:Math.max(1, item.colSpan * cell - Math.min(2, cell * 0.1)),height:Math.max(1, item.rowSpan * cell - Math.min(2, cell * 0.1)),backgroundColor}]}>
                {item.type !== 'booth' && icons[item.type] ? <MaterialCommunityIcons name={icons[item.type]} size={Math.min(22, cell * 0.45)} color={colors.tealDark} /> : null}
                <Text style={[styles.itemLabel, {fontSize: Math.max(4, Math.min(12, cell * 0.3))}, item.type === 'booth' && styles.boothLabel]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{booth?.code || item.label}</Text>
              </Pressable>;
            })}
            {!layout.items.length ? <Text style={styles.empty}>ยังไม่มีวัตถุในแผนผังนี้</Text> : null}
          </View>
        </ScrollView>
      </ScrollView>
      <Text style={styles.footer}>สถานะตามวันที่เลือก · ดูบูธทั้งหมดได้ที่ “บูธปกติ”</Text>
  </View>;
}
const styles = StyleSheet.create({
  screen:{backgroundColor:'#FFF',borderRadius:18,borderWidth:1,borderColor:colors.border,overflow:'hidden',marginTop:14},
  title:{fontSize:14,fontWeight:'700',color:colors.ink,paddingHorizontal:12,paddingTop:12},
  action:{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#EDF7F5'},
  fitAction:{minHeight:36,paddingHorizontal:8,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#EDF7F5'},
  fitLabel:{fontSize:11,color:colors.tealDark},
  toolbar:{flexDirection:'row',alignItems:'center',gap:6,padding:12},
  legend:{flex:1,fontSize:11,color:colors.muted},canvasScroll:{flexGrow:0,backgroundColor:'#F1F5F9'},
  canvasContent:{flexGrow:1},horizontalContent:{padding:12},canvas:{position:'relative',backgroundColor:'#FFF'},
  item:{position:'absolute',alignItems:'center',justifyContent:'center',borderRadius:4,overflow:'hidden'},
  itemLabel:{textAlign:'center',color:colors.ink},boothLabel:{color:'#FFF',fontWeight:'700'},
  empty:{padding:16,fontSize:13,color:colors.muted},footer:{fontSize:11,color:colors.muted,padding:12,textAlign:'center'},
});
