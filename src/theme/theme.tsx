import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {useColorScheme} from 'react-native';

import {STORAGE_THEME_MODE_KEY} from '../constants/storage';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

type Palette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentDark: string;
  inverseText: string;
  danger: string;
  gold: string;
  backdrop: string;
};

const lightPalette: Palette = {
  background: '#f7fbfb',
  surface: '#ffffff',
  surfaceMuted: '#edf7f5',
  text: '#07111f',
  muted: '#607086',
  border: '#dbe7ef',
  accent: '#14a997',
  accentDark: '#087b70',
  inverseText: '#ffffff',
  danger: '#db3b5f',
  gold: '#f6dcae',
  backdrop: 'rgba(7, 17, 31, 0.42)',
};

const darkPalette: Palette = {
  background: '#07131d',
  surface: '#101c28',
  surfaceMuted: '#162736',
  text: '#f3f8fc',
  muted: '#9db0c2',
  border: '#243849',
  accent: '#18b7a4',
  accentDark: '#74e4d5',
  inverseText: '#ffffff',
  danger: '#ff6d86',
  gold: '#ffd8a3',
  backdrop: 'rgba(2, 8, 14, 0.68)',
};

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  palette: Palette;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_THEME_MODE_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark' || value === 'auto') {
          setThemeModeState(value);
        }
      })
      .catch(() => undefined);
  }, []);

  const resolvedTheme: ResolvedTheme = themeMode === 'auto'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themeMode;

  const palette = resolvedTheme === 'dark' ? darkPalette : lightPalette;

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode,
    resolvedTheme,
    palette,
    setThemeMode: async (mode) => {
      setThemeModeState(mode);
      await AsyncStorage.setItem(STORAGE_THEME_MODE_KEY, mode);
    },
  }), [palette, resolvedTheme, themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
