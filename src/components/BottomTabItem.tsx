import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {colors} from '../theme/colors';
import type {TabItem} from '../types/tabs';

function BottomTabItem({
  item,
  active,
  badgeCount = 0,
  onPress,
}: {
  item: TabItem;
  active: boolean;
  badgeCount?: number;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: active ? 1 : 0,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });
  const lift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });
  const labelOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.tabButton}>
      <View style={styles.bottomTab}>
        <Animated.View
          style={[
            styles.iconBubble,
            styles.roundBubble,
            active && styles.iconBubbleActive,
            {transform: [{translateY: lift}, {scale}]},
          ]}>
          <MaterialCommunityIcons
            name={item.icon}
            size={active ? 24 : 17}
            color={active ? colors.white : colors.ink}
          />
        </Animated.View>
        <Animated.Text style={[styles.bottomTabText, {opacity: labelOpacity}]}>
          {item.label}
        </Animated.Text>
        {badgeCount > 0 ? (
          <View style={styles.badge}>
            <Animated.Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Animated.Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
  },
  bottomTab: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    position: 'relative',
  },
  iconBubble: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: -1,
  },
  roundBubble: {
    borderRadius: 24,
  },
  iconBubbleActive: {
    backgroundColor: colors.teal,
    shadowColor: colors.teal,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 10,
  },
  bottomTabText: {
    color: colors.ink,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 10,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 10,
  },
});

export default React.memo(BottomTabItem);
