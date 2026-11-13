import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API runs on :3101. Proxying /api and the data routes keeps cookies
// same-origin, so Better Auth's session cookie works without CORS setup.
export default defineConfig({
  plugins: [react()],
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
