import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import type { PaletteMode } from '@mui/material';

// Define theme settings
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode
          primary: {
            main: '#2196f3',
            light: '#64b5f6',
            dark: '#1976d2',
          },
          secondary: {
            main: '#f50057',
            light: '#ff4081',
            dark: '#c51162',
          },
          background: {
            default: '#f5f5f5',
            paper: '#ffffff',
          },
          text: {
            primary: '#212121',
            secondary: '#666666',
          },
          risk: {
            critical: '#dc3545',
            high: '#ff9800',
            medium: '#2196f3',
            low: '#4caf50',
            informational: '#757575',
          },
        }
      : {
          // Dark mode - Premium dark palette
          primary: {
            main: '#90caf9',
            light: '#bbdefb',
            dark: '#42a5f5',
          },
          secondary: {
            main: '#f48fb1',
            light: '#f8bbd0',
            dark: '#f06292',
          },
          background: {
            default: '#0d1117', // GitHub dark background
            paper: '#161b22', // Slightly lighter for cards
          },
          text: {
            primary: '#e6edf3', // Light gray for primary text
            secondary: '#8b949e', // Medium gray for secondary text
          },
          divider: '#30363d',
          risk: {
            critical: '#ff6b6b',
            high: '#ffa94d',
            medium: '#74c0fc',
            low: '#69db7c',
            informational: '#a6adba',
          },
        }),
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 500,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 500,
      letterSpacing: '-0.3px',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0.3px',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      letterSpacing: '0.4px',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
        } as any,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
          '& .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
});

// Create context
interface ThemeContextType {
  toggleTheme: () => void;
  mode: PaletteMode;
}

const ThemeContext = createContext<ThemeContextType>({
  toggleTheme: () => {},
  mode: 'light',
});

// Custom hook for using theme context
export const useThemeContext = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  // Get initial theme preference from localStorage or system preference
  // Security: Only allow 'light' or 'dark' values, default to system preference
  const getInitialMode = (): PaletteMode => {
    try {
      const savedMode = localStorage.getItem('themeMode');
      // Whitelist validation - only accept valid theme modes
      if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
        return savedMode;
      }
    } catch (e) {
      // localStorage might be disabled or restricted (private browsing)
      console.warn('Cannot access localStorage for theme preference:', e);
    }
    
    // Fallback to system preference if available
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      // Fallback to light mode if matchMedia fails
      console.warn('Cannot detect system color scheme preference:', e);
      return 'light';
    }
  };

  const [mode, setMode] = useState<PaletteMode>(getInitialMode);

  // Create theme instance
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  // Toggle theme function (securely validates new mode)
  const toggleTheme = () => {
    setMode((prevMode: PaletteMode) => {
      const newMode: PaletteMode = prevMode === 'light' ? 'dark' : 'light';
      return newMode;
    });
  };

  // Save theme preference to localStorage with security validation
  useEffect(() => {
    try {
      // Only save valid theme modes
      if (mode === 'light' || mode === 'dark') {
        localStorage.setItem('themeMode', mode);
      }
      // Update HTML data attribute for additional styling and system compatibility
      document.documentElement.setAttribute('data-theme', mode);
      // Update system color scheme preference
      document.documentElement.style.colorScheme = mode;
    } catch (e) {
      // localStorage might be disabled or restricted (private browsing)
      console.warn('Cannot persist theme preference:', e);
    }
  }, [mode]);

  // Listen to system theme changes (when user changes OS dark mode setting)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      const hasUserPreference = localStorage.getItem('themeMode');
      if (!hasUserPreference) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    // Use addEventListener for better browser compatibility
    try {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch (e) {
      // Older browsers don't support addEventListener on MediaQueryList
      console.warn('Cannot listen to system theme changes:', e);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;