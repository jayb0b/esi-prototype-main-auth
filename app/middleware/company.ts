/**
 * Route middleware: company
 *
 * Guards /company/[id] routes. Access is granted if the user holds either:
 *  - ROLE_STAFF — unconditional access to any company page.
 *  - ROLE_EDITOR_<id> — access only when the role's numeric suffix matches
 *    the route's [id] segment (e.g. ROLE_EDITOR_3449 allows /company/3449).
 *
 * Redirect behaviour:
 *  - Not signed in        → /login (with redirect param)
 *  - Signed in, no access → /
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { isLoaded, isSignedIn, user } = useClerkAuth()

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
    const fullUrl = window.location.origin + to.fullPath
    return navigateTo(`/login?redirect=${encodeURIComponent(fullUrl)}`)
  }

  const id = to.params.id as string
  const roles = (user.value?.publicMetadata?.roles as string[] | undefined) ?? []

  const allowed =
    roles.includes('ROLE_STAFF') ||
    roles.includes(`ROLE_EDITOR_${id}`)

  if (!allowed) {
    return navigateTo('/')
  }
})
