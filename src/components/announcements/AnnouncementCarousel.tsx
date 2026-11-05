import {Text} from '../AppText';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, AppState, Image, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import type {Announcement} from '../../services/announcements';
import {colors} from '../../theme/colors';

export default function AnnouncementCarousel({items, onPress}: {items: Announcement[]; onPress: (item: Announcement) => void}) {
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {if (mounted) {setReduceMotion(value);}}).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => {mounted = false; motion.remove(); app.remove();};
  }, []);
  useEffect(() => {
    setIndex(0);
    scroll.current?.scrollTo({x: 0, animated: false});
  }, [width, items.length]);
  const goTo = useCallback((next: number) => {
    scroll.current?.scrollTo({x: width * next, animated: !reduceMotion});
    setIndex(next);
  }, [width, reduceMotion]);
  useEffect(() => {
    if (items.length < 2 || !width || !active || dragging || reduceMotion) {return;}
    const timer = setTimeout(() => goTo((index + 1) % items.length), 5000);
    return () => clearTimeout(timer);
  }, [items.length, width, active, dragging, reduceMotion, index, goTo]);
  if (!items.length) {return null;}
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.wrapper}>
    <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      onScrollBeginDrag={() => setDragging(true)} onScrollEndDrag={() => setDragging(false)}
      onMomentumScrollEnd={event => {if (width) {setIndex(Math.min(items.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width))));}}}>
      {items.map(item => <View key={item.id} style={{width}}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.marketName}: ${item.title}`} onPress={() => onPress(item)} style={styles.card}>
          {item.imageUrl ? <Image source={{uri: item.imageUrl}} style={StyleSheet.absoluteFillObject} resizeMode="cover" /> : null}
          <View style={styles.badge}><Text style={styles.badgeText}>แนะนำตลาด</Text></View>
          <View style={styles.overlay}>
            <Text style={styles.market}>{item.marketName}</Text>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          </View>
        </Pressable>
      </View>)}
    </ScrollView>
    {items.length > 1 ? <View style={styles.controls}>
      <View style={styles.dots}>{items.map((item, position) => <Pressable key={item.id}
        accessibilityRole="button" accessibilityLabel={`แบนเนอร์ ${position + 1} จาก ${items.length}`} accessibilityState={{selected: index === position}}
        hitSlop={8} onPress={() => goTo(position)} style={[styles.dot, index === position && styles.dotActive]} />)}</View>

    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  wrapper: {width: '100%'}, card: {height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.navy},
  badge: {position: 'absolute', top: 14, right: 14, borderRadius: 12, backgroundColor: '#ffffffeb', paddingVertical: 5, paddingHorizontal: 10},
  badgeText: {fontSize: 11, fontWeight: '700', color: colors.tealDark},
  overlay: {position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(7,24,39,0.85)'},
  market: {color: '#dff8f4', fontSize: 12, fontWeight: '800'}, title: {marginTop: 4, color: colors.white, fontSize: 20, lineHeight: 26, fontWeight: '900'},
  description: {marginTop: 6, color: '#dce7ee', fontSize: 13, lineHeight: 19},
  controls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4},
  dots: {flexDirection: 'row', gap: 8}, dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#c6d7da'}, dotActive: {width: 22, backgroundColor: colors.teal},
});
