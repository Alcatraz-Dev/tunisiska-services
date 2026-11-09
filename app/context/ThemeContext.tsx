import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light'
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(systemColorScheme || 'light');
  const [themeLoaded, setThemeLoaded] = useState(false);
  const userChangedTheme = useRef(false);

  // Load saved theme from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme');
        if (!userChangedTheme.current && savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeState(savedTheme as Theme);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setThemeLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Update resolved theme based on current theme setting
  useEffect(() => {
    if (theme === 'system') {
      setResolvedTheme(systemColorScheme || 'light');
    } else {
      setResolvedTheme(theme);
    }
  }, [theme, systemColorScheme]);

  // Keep NativeWind's `dark:` utilities in step with the same app-wide choice.
  useEffect(() => {
    setColorScheme(resolvedTheme);
    // NativeWind returns this helper inline; the resolved mode is the changing input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]);

  // Save theme to storage when it changes
  useEffect(() => {
    const saveTheme = async () => {
      if (!themeLoaded) return;
      try {
        await AsyncStorage.setItem('app-theme', theme);
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    };

    saveTheme();
  }, [theme, themeLoaded]);

  const setTheme = useCallback((newTheme: Theme) => {
    userChangedTheme.current = true;
    setThemeState(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
