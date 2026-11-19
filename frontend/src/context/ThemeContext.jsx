import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Determine initial scheme
  const getInitialTheme = () => {
    try {
      const stored = localStorage.getItem('color-scheme') || localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (e) {
      // In case localStorage is blocked
    }
    // Fallback to system preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply theme to DOM
  const applyTheme = useCallback((targetTheme) => {
    if (typeof document === 'undefined') return;

    const isDark = targetTheme === 'dark';
    const root = document.documentElement;

    // 1. Update documentElement classes for Tailwind dark: variants and CSS rules
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // 2. Update CSS color-scheme
    root.style.colorScheme = targetTheme;

    // 3. Update <meta name="color-scheme">
    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'color-scheme';
      document.head.appendChild(meta);
    }
    meta.content = targetTheme;
  }, []);

  // Update theme & persistence
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('color-scheme', newTheme);
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      // Ignore localStorage errors
    }
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  // Initial sync and listener for system / cross-tab changes
  useEffect(() => {
    applyTheme(theme);

    // Cross-tab synchronization
    const handleStorage = (e) => {
      if (e.key === 'color-scheme' || e.key === 'theme') {
        const val = e.newValue;
        if (val === 'light' || val === 'dark') {
          setThemeState(val);
          applyTheme(val);
        }
      }
    };

    // System preference change listener
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e) => {
      const stored = localStorage.getItem('color-scheme');
      // If user hasn't explicitly stored a preference, follow system
      if (!stored) {
        const sysTheme = e.matches ? 'dark' : 'light';
        setThemeState(sysTheme);
        applyTheme(sysTheme);
      }
    };

    window.addEventListener('storage', handleStorage);
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, [applyTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
