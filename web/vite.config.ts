import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3101',
      '/me': 'http://localhost:3101',
      '/messages': 'http://localhost:3101',
      '/aiChat': 'http://localhost:3101',
      '/moveChat': 'http://localhost:3101',
      '/rag': 'http://localhost:3101',
    },
  },
});
