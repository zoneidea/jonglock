import AsyncStorage from '@react-native-async-storage/async-storage';
import {WEATHER_API_KEY} from '../config/weather.local';

export type WeatherScene = 'clear' | 'hot' | 'cloudy' | 'rain' | 'night';
export type MarketWeather = {
  temperature: number;
  description: string;
  scene: WeatherScene;
  isDay: boolean;
  updatedAt: number;
  fetchedAt: number;
};
const TTL = 15 * 60 * 1000;
const MAX_STALE = 60 * 60 * 1000;
const memory = new Map<string, MarketWeather>();
const pending = new Map<string, Promise<MarketWeather | null>>();
const retryAfter = new Map<string, number>();
const rainCodes = new Set([1063, 1069, 1072, 1087, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1204, 1207, 1240, 1243, 1246, 1249, 1252, 1273, 1276]);

export function weatherScene(code: number, isDay: boolean, temperature: number): WeatherScene {
  if (rainCodes.has(code)) { return 'rain'; }
  if ([1006, 1009, 1030, 1135, 1147, 1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1255, 1258, 1261, 1264, 1279, 1282].includes(code)) { return 'cloudy'; }
  if (!isDay) { return 'night'; }
  return temperature >= 35 ? 'hot' : 'clear';
}

function validWeather(value: MarketWeather | null): value is MarketWeather {
  return Boolean(value && Number.isFinite(value.temperature) && Number.isFinite(value.updatedAt)
    && Number.isFinite(value.fetchedAt) && typeof value.description === 'string'
    && ['clear', 'hot', 'cloudy', 'rain', 'night'].includes(value.scene));
}

// No user location, identity, payment data, provider URL or API key is logged/stored.
export async function getMarketWeather(latitude?: number | null, longitude?: number | null): Promise<MarketWeather | null> {
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !WEATHER_API_KEY) { return null; }
  const point = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const key = `jonglock.weather.v1:${point}`;
  const cached = memory.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL) { return cached; }
  if (pending.has(key)) { return pending.get(key)!; }
  const task = (async () => {
    let previous = cached;
    try {
      if (!previous) {
        const stored = await AsyncStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) : null;
        if (validWeather(parsed)) { previous = parsed; }
      }
    } catch { /* Cache storage must never prevent weather loading. */ }
    const fallback = previous && Date.now() - previous.fetchedAt < MAX_STALE ? previous : null;
    if (previous && Date.now() - previous.fetchedAt < TTL) {
      memory.set(key, previous);
      return previous;
    }
    if ((retryAfter.get(key) || 0) > Date.now()) { return fallback; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(WEATHER_API_KEY)}&q=${encodeURIComponent(point)}&lang=th&aqi=no`, {signal: controller.signal});
      if (!response.ok) { throw new Error('Weather unavailable'); }
      const body = await response.json();
      const current = body.current;
      if (!current || !Number.isFinite(current.temp_c) || !Number.isFinite(current.last_updated_epoch)
        || !Number.isFinite(current.condition?.code) || typeof current.condition?.text !== 'string'
        || ![0, 1].includes(current.is_day)) { throw new Error('Invalid weather response'); }
      const weather: MarketWeather = {
        temperature: current.temp_c, description: current.condition.text,
        scene: weatherScene(current.condition.code, current.is_day === 1, current.temp_c),
        isDay: current.is_day === 1, updatedAt: current.last_updated_epoch * 1000, fetchedAt: Date.now(),
      };
      memory.set(key, weather);
      // Bound in-process storage; persistent cache contains public weather only.
      if (memory.size > 50) { memory.delete(memory.keys().next().value!); }
      retryAfter.delete(key);
      try { await AsyncStorage.setItem(key, JSON.stringify(weather)); } catch { /* Optional cache. */ }
      return weather;
    } catch {
      retryAfter.set(key, Date.now() + TTL);
      return fallback;
    } finally { clearTimeout(timeout); }
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
