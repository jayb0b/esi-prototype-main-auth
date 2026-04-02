import type { H3Event } from 'h3'

/**
 * Returns a $fetch instance pre-configured for the content API using a
 * server-to-server secret header instead of a Clerk JWT.
 *
 * Use this for server-to-server calls where no Clerk user session is available
 * (e.g. pre-auth registration steps, internal lookups). The content API must
 * be configured to accept the X-Server-Secret header as an alternative to a
 * Bearer token for the relevant endpoints.
 */
export function useContentApiServer(event: H3Event) {
  const config = useRuntimeConfig(event)
  return $fetch.create({
    baseURL: config.contentApiUrl,
    headers: { 'X-Server-Secret': config.contentApiServerSecret },
  })
}
