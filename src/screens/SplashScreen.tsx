import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Image, StatusBar, StyleSheet, Text} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {colors, shadow} from '../theme/colors';
import appIcon from '../assets/app-icon.png';

function SplashScreen({onReady}: {onReady: () => void}) {
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 620,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(ring, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ]).start();

    const timer = setTimeout(onReady, 1900);
    return () => clearTimeout(timer);
  }, [onReady, opacity, ring, scale]);

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.55],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.55, 0.15, 0],
  });

  return (
    <LinearGradient colors={[colors.white, '#eefaf8']} style={styles.splash}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <Animated.View
        style={[
          styles.splashRing,
          {opacity: ringOpacity, transform: [{scale: ringScale}]},
        ]}
      />
      <Animated.View style={[styles.logoMark, {opacity, transform: [{scale}]}]}>
        <Image source={appIcon} style={styles.logoIcon} />
      </Animated.View>
      <Animated.Text style={[styles.brandName, {opacity}]}>JONGLOCK</Animated.Text>
      <Animated.Text style={[styles.brandSubtitle, {opacity}]}>
        Market Booking Platform
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashRing: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  logoMark: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    overflow: 'hidden',
    ...shadow,
  },
  logoIcon: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  brandName: {
    marginTop: 22,
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SplashScreen;
