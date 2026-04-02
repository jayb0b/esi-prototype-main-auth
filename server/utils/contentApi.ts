import type { H3Event } from 'h3'

/**
 * Returns a $fetch instance pre-configured for the content API.
 *
 * Attaches a Clerk JWT (using the 'content-api' template) as a Bearer token
 * so the Java API can verify the request came from an authenticated session.
 * Mirrors the client-side $contentApi plugin but for use in server handlers.
 */
export function useContentApi(event: H3Event) {
  const config = useRuntimeConfig()
  const { getToken } = event.context.auth()

  return $fetch.create({
    baseURL: config.contentApiUrl,
    onRequest: async ({ options }) => {
      const token = await getToken({ template: 'content-api' })
      if (token) {
        options.headers = new Headers(options.headers as HeadersInit)
        options.headers.set('Authorization', `Bearer ${token}`)
      }
    },
  })
}
