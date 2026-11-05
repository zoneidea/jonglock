import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, AppState, Easing, Linking, Pressable, StatusBar, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Text} from './AppText';
import {getMarketWeather, weatherLabel, type MarketWeather} from '../services/weather';

const palettes = {
  clear: ['#B9E6FA', '#EAF8FE', '#F6FBFC'], hot: ['#FBE3A3', '#FFF5D7', '#F6FBFC'],
  cloudy: ['#A8B8C7', '#E3EAF0', '#F6FBFC'], rain: ['#6E8499', '#D8E5EE', '#F6FBFC'],
  night: ['#162C4C', '#526986', '#E7EDF4'],
};

export function useMarketWeather(latitude?: number | null, longitude?: number | null) {
  const [weather, setWeather] = useState<MarketWeather | null>(null);
  useEffect(() => {
    let mounted = true;
    let sequence = 0;
    setWeather(null);
    const refresh = async () => {
      const id = ++sequence;
      const result = await getMarketWeather(latitude, longitude);
      if (mounted && id === sequence) { setWeather(result); }
    };
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') { refresh(); } }, 15 * 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') { refresh(); } });
    return () => { mounted = false; sequence += 1; clearInterval(timer); subscription.remove(); };
  }, [latitude, longitude]);
  return weather;
}

export default function MarketWeatherBackground({weather}: {weather: MarketWeather | null}) {
  const insets = useSafeAreaInsets();
  const phase = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const scene = weather?.scene;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted) { setReduceMotion(enabled); } });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    phase.setValue(0);
    if (!scene || reduceMotion || !active) { return; }
    const animation = Animated.loop(Animated.timing(phase, {
      toValue: 1, duration: scene === 'rain' ? 1600 : 16000,
      easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [active, phase, reduceMotion, scene]);
  if (!weather) { return null; }
  const rain = scene === 'rain';
  const cloudy = rain || scene === 'cloudy';
  // Extend only the decorative layer behind the status bar; keep content in its safe area.
  return <View style={[StyleSheet.absoluteFill, {top: -insets.top}]} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    <StatusBar translucent backgroundColor="transparent" barStyle={scene === 'night' || rain ? 'light-content' : 'dark-content'} />
    <LinearGradient colors={palettes[weather.scene]} style={StyleSheet.absoluteFill} />
    {cloudy ? <View style={styles.clouds}>
      {[0, 1, 2].map((i) => <Animated.View key={i} style={[styles.cloud, {top: i * 46, left: `${i * 25 - 8}%`}, rain ? styles.darkCloud : styles.lightCloud, {
        transform: [{translateX: phase.interpolate({inputRange: [0, 0.5, 1], outputRange: [-18, 18, -18]})}]}]}>
        <MaterialCommunityIcons name="cloud" size={160 + i * 20} color={rain ? '#42586C' : '#FFF'} />
      </Animated.View>)}
    </View> : <Animated.View style={[styles.sun, {opacity: phase.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.65, 1, 0.65]})}]}>
      <MaterialCommunityIcons name={scene === 'night' ? 'weather-night' : 'white-balance-sunny'} size={110} color={scene === 'night' ? '#E6EFFF' : '#FFC74A'} />
    </Animated.View>}
    {rain ? <Animated.View style={[styles.rain, {transform: [{translateY: phase.interpolate({inputRange: [0, 1], outputRange: [-100, 0]})}]}]}>
      {Array.from({length: 30}, (_, i) => <View key={i} style={[styles.drop, {left: `${(i * 37) % 100}%`, top: (i % 6) * 100}]} />)}
    </Animated.View> : null}
  </View>;
}

export function MarketWeatherSummary({weather}: {weather: MarketWeather | null}) {
  if (!weather) { return null; }
  const stale = Date.now() - weather.fetchedAt >= 15 * 60 * 1000;
  return <View style={styles.summary} pointerEvents="none" accessibilityLabel={`${weatherLabel(weather)} ${Math.round(weather.temperature)} องศาเซลเซียส${stale ? ' ข้อมูลล่าสุดที่มี' : ''}`} accessible>
    <Text style={styles.temperature} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{Math.round(weather.temperature)}°C</Text>
    <Text style={styles.condition} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{weatherLabel(weather)}</Text>
  </View>;
}

export function MarketWeatherCredit({weather}: {weather: MarketWeather | null}) {
  if (!weather) { return null; }
  return <Pressable accessibilityRole="link" accessibilityLabel="ข้อมูลอากาศจาก WeatherAPI.com" onPress={() => { Linking.openURL('https://www.weatherapi.com/').catch(() => {}); }}>
    <Text style={styles.credit}>WeatherAPI.com</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  cloud: {position: 'absolute'},
  darkCloud: {opacity: 0.4},
  lightCloud: {opacity: 0.55},
  clouds: {position: 'absolute', top: 5, left: 0, right: 0, height: 260},
  sun: {position: 'absolute', top: 25, right: 24},
  rain: {position: 'absolute', top: 0, left: 0, right: 0, height: 700, opacity: 0.3},
  drop: {position: 'absolute', width: 2, height: 21, borderRadius: 2, backgroundColor: '#FFF', transform: [{rotate: '15deg'}]},
  summary: {position: 'absolute', left: 80, right: 80, top: 0, height: 42, alignItems: 'center', justifyContent: 'center'},
  temperature: {fontSize: 14, fontWeight: '700', color: '#102E43'},
  condition: {fontSize: 11, fontWeight: '500', color: '#102E43'},
  credit: {fontSize: 10, color: '#297D86', textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 8},
});
