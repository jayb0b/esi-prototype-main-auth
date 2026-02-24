/**
 * Nuxt plugin: $api — a $fetch instance that attaches the Clerk session JWT
 * as a Bearer token on every request.
 *
 * Clerk session cookies are sent automatically on same-origin requests, so
 * you don't need this for Nuxt's own server API routes. Use it when calling
 * external APIs that expect an Authorization header rather than a cookie.
 *
 * Usage with useFetch (reactive, SSR-compatible):
 *   const { $api } = useNuxtApp()
 *   const { data } = useFetch('https://api.example.com/things', { $fetch: $api })
 *
 * Usage for one-off imperative calls:
 *   const { $api } = useNuxtApp()
 *   const data = await $api('https://api.example.com/things')
 */
export default defineNuxtPlugin(() => {
  const { getToken } = useAuth()

  const contentApi = $fetch.create({
    onRequest: async ({ options }) => {
      const token = await getToken.value({ template: 'content-api' })
      if (token) {
        // Use the Headers constructor to safely merge with any existing headers
        // rather than clobbering them with a plain object spread.
        options.headers = new Headers(options.headers as HeadersInit)
        options.headers.set('Authorization', `Bearer ${token}`)
      }
    },
  })

  return {
    provide: { contentApi },
  }
})
