import { createTheme } from '@mui/material/styles';

// Custom color palette based on security risk levels
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3', // Blue - Primary brand color
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#f50057', // Pink - Secondary brand color
      light: '#ff4081',
      dark: '#c51162',
    },
    risk: {
      critical: '#dc3545', // Red
      high: '#ff9800',    // Orange
      medium: '#2196f3',  // Blue
      low: '#4caf50',     // Green
      informational: '#757575', // Grey
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Prevents all-caps text in buttons
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
});