import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// TanStack Start owns the dev/build pipeline (router generation, SSR entry).
// The API still runs separately on :3101; the proxy below keeps Better Auth's
// session cookie same-origin.
export default defineConfig({
  plugins: [tanstackStart(), viteReact()],
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
