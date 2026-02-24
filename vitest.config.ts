import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Node 18+ provides Headers, fetch, etc. natively — no DOM library needed.
    environment: 'node',
    globals: true,
  },
})
