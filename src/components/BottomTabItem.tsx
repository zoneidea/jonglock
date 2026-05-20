import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
});

export default React.memo(BottomTabItem);
