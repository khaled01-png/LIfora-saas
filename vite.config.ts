import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Local development: forward /api to the FastAPI server (python -m backend.run).
      // Used when VITE_API_BASE_URL is not set (local development only).
      proxy: {
        '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
  };
});
