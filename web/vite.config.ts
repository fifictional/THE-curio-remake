import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  server: {
    port: 5173,
    // Everything the API owns. Keep in sync with server/app.ts routes: a missing
    // entry is a 404 from the Vite server, not from the API. Prefixes that are
    // also app routes (`/documents/<uuid>`) are deliberately absent — the app
    // creates documents through `/api/documents` instead.
    proxy: Object.fromEntries(
      [
        '/api',
        '/me',
        '/messages',
        '/aiChat',
        '/moveChat',
        '/rag',
        '/files',
        '/db',
        '/account',
        '/log',
      ].map((path) => [path, 'http://localhost:3101']),
    ),
  },
});
