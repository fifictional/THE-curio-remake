import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the server functions and helpers.
 *
 * No browser, no router: the handlers are plain async functions once the fetch
 * seam is mocked, and that is exactly the layer with the auth/uuid edge cases.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
