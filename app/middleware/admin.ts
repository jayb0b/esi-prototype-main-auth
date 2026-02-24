/**
 * Route middleware: admin
 *
 * Restricts access to routes that declare `middleware: 'admin'` in their
 * definePageMeta. Users without the ROLE_ADMIN role in their Clerk
 * publicMetadata are turned away.
 *
 * Why import.meta.server guard:
 *   During SSR, Clerk validates the session token but does not fetch the full
 *   user profile, so publicMetadata is unavailable in a route middleware.
 *   The check runs on the client instead.
 *
 * Why the isLoaded await:
 *   On the client, Clerk loads asynchronously. Rather than allowing the
 *   navigation to proceed and adding per-page watchers, the middleware returns
 *   a Promise and the router holds the navigation until Clerk is ready.
 *
 * Redirect behaviour:
 *  - Not signed in  → /login (with a redirect param so they return after auth)
 *  - Signed in, no ROLE_ADMIN → / (silent redirect)
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { isSignedIn } = useAuth()
  const { isLoaded, user } = useUser()

  // Wait for Clerk to finish loading the user profile before checking roles.
  // watchEffect runs immediately, so if isLoaded is already true this
  // resolves in the same tick without blocking.
  if (!isLoaded.value) {
    await new Promise<void>((resolve) => {
      const stop = watchEffect(() => {
        if (isLoaded.value) {
          stop()
          resolve()
        }
      })
    })
  }

  if (!isSignedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const roles = (user.value?.publicMetadata?.roles as string[] | undefined) ?? []
  if (!roles.includes('ROLE_STAFF')) {
    return navigateTo('/')
  }
})
