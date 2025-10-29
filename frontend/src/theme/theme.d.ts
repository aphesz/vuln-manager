import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    risk: {
      critical: string;
      high: string;
      medium: string;
      low: string;
      informational: string;
      [key: string]: string;
    };
  }

  interface PaletteOptions {
    risk?: {
      critical: string;
      high: string;
      medium: string;
      low: string;
      informational: string;
      [key: string]: string;
    };
  }
}