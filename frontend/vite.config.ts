import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: ['es2015', 'safari11'], // Support older Safari versions including mobile
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2015', // Transpile dependencies for older browsers
    },
  },
  define: {
    // Use empty string to force relative /api paths (works on both desktop and mobile)
    'process.env.REACT_APP_API_URL': JSON.stringify(''),
  },
})
