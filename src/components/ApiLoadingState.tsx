import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View, type ViewStyle} from 'react-native';

import {colors, shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';

function ApiLoadingState({
  label = 'กำลังโหลดข้อมูล',
  variant = 'card',
  style,
}: {
  label?: string;
  variant?: 'card' | 'inline';
  style?: ViewStyle;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const {palette} = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
      progress.setValue(0);
    };
  }, [progress]);

  return (
    <View
      style={[
        styles.base,
        variant === 'card' ? styles.card : styles.inline,
        variant === 'card'
          ? {borderColor: palette.border, backgroundColor: palette.surface}
          : null,
        style,
      ]}>
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((index) => {
          const opacity = progress.interpolate({
            inputRange: [0, 0.2 + index * 0.12, 0.4 + index * 0.12, 1],
            outputRange: [0.28, 1, 0.34, 0.28],
          });
          const scale = progress.interpolate({
            inputRange: [0, 0.2 + index * 0.12, 0.4 + index * 0.12, 1],
            outputRange: [0.92, 1.18, 0.92, 0.92],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: palette.accent,
                  opacity,
                  transform: [{scale}],
                },
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.label, {color: palette.muted}, variant === 'inline' && styles.inlineLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    minHeight: 120,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 22,
    ...shadow,
  },
  inline: {
    paddingVertical: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.teal,
  },
  label: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  inlineLabel: {
    marginTop: 10,
    fontSize: 12,
  },
});

export default React.memo(ApiLoadingState);
