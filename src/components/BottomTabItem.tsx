import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text} from 'react-native';

import {colors} from '../theme/colors';
import type {TabItem} from '../types/tabs';

function BottomTabItem({
  item,
  active,
  onPress,
}: {
  item: TabItem;
  active: boolean;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: active ? 1 : 0,
      friction: 7,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [72, 104],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.bottomTab,
          active && styles.bottomTabActive,
          {width, transform: [{scale}]},
        ]}>
        <Text style={[styles.bottomTabIcon, active && styles.bottomTabIconActive]}>
          {item.icon}
        </Text>
        <Text style={[styles.bottomTabText, active && styles.bottomTabTextActive]}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomTab: {
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bottomTabActive: {
    backgroundColor: colors.teal,
  },
  bottomTabIcon: {
    color: colors.muted,
    fontSize: 21,
    fontWeight: '900',
  },
  bottomTabIconActive: {
    color: colors.white,
  },
  bottomTabText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  bottomTabTextActive: {
    color: colors.white,
    fontSize: 11,
  },
});

export default BottomTabItem;
