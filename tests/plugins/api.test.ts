import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

/**
 * Unit tests for app/plugins/api.ts.
 *
 * The plugin relies on Nuxt auto-imports (defineNuxtPlugin, useAuth, $fetch)
 * rather than explicit ES imports, so we stub them on globalThis before
 * importing the plugin. The plugin is re-imported fresh for each test via
 * vi.resetModules() so that each test gets a clean closure.
 */

const mockGetToken = vi.fn()

// Stub the Nuxt/Clerk globals once. These don't change between tests;
// only mockGetToken's return value changes.
beforeAll(() => {
  vi.stubGlobal('defineNuxtPlugin', (setup: () => unknown) => setup)
  vi.stubGlobal('useAuth', () => ({
    getToken: { value: mockGetToken },
  }))
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type OnRequest = (ctx: { options: { headers?: unknown } }) => Promise<void>

/**
 * Stubs $fetch.create, imports a fresh copy of the plugin, runs its setup
 * function, and returns the captured onRequest interceptor plus the plugin's
 * provide object.
 */
async function loadPlugin() {
  let onRequest!: OnRequest

  vi.stubGlobal('$fetch', {
    create: (config: { onRequest: OnRequest }) => {
      onRequest = config.onRequest
      return vi.fn() // the created fetch instance; content doesn't matter here
    },
  })

  const { default: plugin } = await import('../../app/plugins/api')
  const result = (plugin as () => { provide: Record<string, unknown> })()

  return { onRequest, provide: result.provide }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api plugin', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockGetToken.mockResolvedValue(null) // default: no active session
  })

  it('provides a contentApi function', async () => {
    const { provide } = await loadPlugin()
    expect(provide.contentApi).toBeDefined()
    expect(typeof provide.contentApi).toBe('function')
  })

  describe('onRequest interceptor', () => {
    it('sets the Authorization header when a token is available', async () => {
      mockGetToken.mockResolvedValue('clerk-jwt-token')
      const { onRequest } = await loadPlugin()

      const options: { headers?: unknown } = {}
      await onRequest({ options })

      expect(options.headers).toBeInstanceOf(Headers)
      expect((options.headers as Headers).get('Authorization')).toBe('Bearer clerk-jwt-token')
    })

    it('does not set the Authorization header when getToken returns null', async () => {
      mockGetToken.mockResolvedValue(null)
      const { onRequest } = await loadPlugin()

      const options: { headers?: unknown } = {}
      await onRequest({ options })

      expect(options.headers).toBeUndefined()
    })

    it('preserves existing headers when adding Authorization', async () => {
      mockGetToken.mockResolvedValue('my-token')
      const { onRequest } = await loadPlugin()

      const options = { headers: { 'Content-Type': 'application/json' } }
      await onRequest({ options })

      const headers = options.headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer my-token')
      expect(headers.get('Content-Type')).toBe('application/json')
    })

    it('overwrites any pre-existing Authorization header', async () => {
      mockGetToken.mockResolvedValue('new-token')
      const { onRequest } = await loadPlugin()

      const options = { headers: { Authorization: 'Bearer old-token' } }
      await onRequest({ options })

      expect((options.headers as Headers).get('Authorization')).toBe('Bearer new-token')
    })
  })
})
