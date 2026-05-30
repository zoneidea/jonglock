import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';
import {API_BASE_URL} from '../config/api';

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type AppConfig = {
  appIcon?: {
    activeIconKey?: string;
  };
};

type IconSwitcherNative = {
  setIconName?: (iconKey: string) => Promise<string>;
  getIconName?: () => Promise<string>;
};

const STORAGE_APP_ICON_KEY = 'jonglock.activeAppIconKey';
const SUPPORTED_ICON_KEYS = new Set(['default', 'teal', 'midnight']);

function normalizeIconKey(iconKey?: string | null) {
  return iconKey && SUPPORTED_ICON_KEYS.has(iconKey) ? iconKey : 'default';
}

async function fetchAppConfig() {
  const response = await fetch(`${API_BASE_URL}/public/app-config`);
  if (!response.ok) {
    throw new Error(`App config failed with status ${response.status}`);
  }
  const payload = await response.json() as ApiResponse<AppConfig>;
  return payload.data;
}

export async function syncDynamicAppIcon() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }
  const nativeSwitcher = NativeModules.IconSwitcher as IconSwitcherNative | undefined;
  if (!nativeSwitcher?.setIconName) {
    return;
  }

  try {
    const config = await fetchAppConfig();
    const nextIconKey = normalizeIconKey(config.appIcon?.activeIconKey);
    const lastIconKey = await AsyncStorage.getItem(STORAGE_APP_ICON_KEY);
    if (lastIconKey === nextIconKey) {
      return;
    }
    await nativeSwitcher.setIconName(nextIconKey);
    await AsyncStorage.setItem(STORAGE_APP_ICON_KEY, nextIconKey);
  } catch {
    // Icon switching is cosmetic; never block app startup.
  }
}
