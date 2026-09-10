import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type UIStyle = 'modern' | 'slate' | 'minimal' | 'editorial';
export type UIDensity = 'standard' | 'compact';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  uiStyle: UIStyle;
  setUiStyle: (style: UIStyle) => void;
  uiDensity: UIDensity;
  setUiDensity: (density: UIDensity) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('ledger_theme') as Theme | null;
    return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'light';
  });

  const [uiStyle, setUiStyleState] = useState<UIStyle>(() => {
    const saved = localStorage.getItem('ledger_ui_style') as UIStyle | null;
    return saved === 'modern' || saved === 'slate' || saved === 'minimal' || saved === 'editorial'
      ? saved
      : 'modern';
  });

  const [uiDensity, setUiDensityState] = useState<UIDensity>(() => {
    const saved = localStorage.getItem('ledger_ui_density') as UIDensity | null;
    return saved === 'compact' || saved === 'standard' ? saved : 'standard';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Apply UI Style and Density
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-ui-style', uiStyle);
    localStorage.setItem('ledger_ui_style', uiStyle);
  }, [uiStyle]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-ui-density', uiDensity);
    localStorage.setItem('ledger_ui_density', uiDensity);
  }, [uiDensity]);

  useEffect(() => {
    const root = document.documentElement;

    const computeResolvedTheme = (currentTheme: Theme): ResolvedTheme => {
      if (currentTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
      }
      return currentTheme;
    };

    const nextResolved = computeResolvedTheme(theme);
    setResolvedTheme(nextResolved);

    if (nextResolved === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    localStorage.setItem('ledger_theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const updated = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(updated);
        if (updated === 'dark') {
          root.classList.add('dark');
          root.setAttribute('data-theme', 'dark');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.remove('dark');
          root.setAttribute('data-theme', 'light');
          root.style.colorScheme = 'light';
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setUiStyle = (newStyle: UIStyle) => {
    setUiStyleState(newStyle);
  };

  const setUiDensity = (newDensity: UIDensity) => {
    setUiDensityState(newDensity);
  };

  const toggleTheme = () => {
    setThemeState((curr) => {
      const next = curr === 'dark' ? 'light' : 'dark';
      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        uiStyle,
        setUiStyle,
        uiDensity,
        setUiDensity,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
