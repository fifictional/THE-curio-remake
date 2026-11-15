import { defineConfig } from 'vitest/config';

/**
 * API tests only. `ui/` is the copied legacy Next app and carries its own test
 * suite (which needs Amplify); `web/` is the new client.
 */
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'ui/**', 'web/**', 'dist/**'],
  },
});
