import AsyncStorage from '@react-native-async-storage/async-storage';
import {getMarketWeather, weatherScene} from '../src/services/weather';

jest.mock('../src/config/weather.local', () => ({WEATHER_API_KEY: 'test-key'}));

describe('market weather', () => {
  const originalFetch = global.fetch;
  afterAll(() => { global.fetch = originalFetch; });
  test('maps rain and clouds before day/night, with hot threshold', () => {
    expect(weatherScene(1183, false, 25)).toBe('rain');
    expect(weatherScene(1009, false, 25)).toBe('cloudy');
    expect(weatherScene(1000, false, 25)).toBe('night');
    expect(weatherScene(1000, true, 35)).toBe('hot');
    expect(weatherScene(1003, true, 30)).toBe('clear');
  });
  test('uses market coordinates directly, coalesces requests and caches', async () => {
    global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({current: {
      temp_c: 32, last_updated_epoch: 1793870000, is_day: 1, condition: {code: 1000, text: 'แจ่มใส'},
    }})});
    const [a, b] = await Promise.all([getMarketWeather(13.75, 100.5), getMarketWeather(13.75, 100.5)]);
    expect(a).toEqual(b);
    expect(a?.scene).toBe('clear');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('q=13.750000%2C100.500000');
    await getMarketWeather(13.75, 100.5);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify((AsyncStorage.setItem as jest.Mock).mock.calls)).not.toContain('test-key');
  });
  test('missing coordinates never request weather; network errors fall back without blocking', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    expect(await getMarketWeather(null, null)).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(await getMarketWeather(15, 101)).toBeNull();
    expect(await getMarketWeather(15, 101)).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
