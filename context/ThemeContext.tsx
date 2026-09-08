import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  mode: ThemeMode;
  isDark: boolean;
  background: string;
  card: string;
  cardSecondary: string;
  border: string;
  text: string;
  textMuted: string;
  textSub: string;
  primary: string;
  primaryBg: string;
  inputBg: string;
  modalOverlay: string;
  trackBg: string;
  shadow: string;
  accentSuccess: string;
  accentError: string;
  accentWarning: string;
  accentInfo: string;
}

export const DarkTheme: ThemeColors = {
  mode: 'dark',
  isDark: true,
  background: '#000000',
  card: '#000000ff',
  cardSecondary: '#000000ff',
  border: '#595959ff',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  textSub: '#64748B',
  primary: '#5182d8',
  primaryBg: 'rgba(81, 130, 216, 0.15)',
  inputBg: '#1C253B',
  modalOverlay: 'rgba(12, 15, 23, 0.8)',
  trackBg: '#1E293B',
  shadow: '#000000',
  accentSuccess: '#10B981',
  accentError: '#EF4444',
  accentWarning: '#F59E0B',
  accentInfo: '#3B82F6',
};

export const LightTheme: ThemeColors = {
  mode: 'light',
  isDark: false,
  background: '#FFFFF0',
  card: '#faf4dfff',
  cardSecondary: '#f5f0deff',
  border: '#babab8ff',
  text: '#1C1917',
  textMuted: '#57534E',
  textSub: '#78716C',
  primary: '#5182d8',
  primaryBg: 'rgba(81, 130, 216, 0.15)',
  inputBg: '#E4DEC7',
  modalOverlay: 'rgba(28, 25, 23, 0.45)',
  trackBg: '#D8D1B5',
  shadow: 'rgba(28, 25, 23, 0.08)',
  accentSuccess: '#059669',
  accentError: '#DC2626',
  accentWarning: '#D97706',
  accentInfo: '#2563EB',
};

const THEME_STORAGE_KEY = '@nutrivision_theme_mode';

interface ThemeContextType {
  theme: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DarkTheme,
  mode: 'dark',
  isDark: true,
  toggleTheme: () => { },
  setThemeMode: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    // Load persisted theme choice on launch
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedMode) => {
        if (savedMode === 'light' || savedMode === 'dark') {
          setMode(savedMode);
        }
      })
      .catch((err) => console.warn('Error loading theme mode:', err));
  }, []);

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch((err) =>
      console.warn('Error saving theme mode:', err)
    );
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  };

  const theme = mode === 'light' ? LightTheme : DarkTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        isDark: mode === 'dark',
        toggleTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
