/**
 * Hydrates the user store from Clerk's reactive state on the client.
 *
 * Watches Clerk's isLoaded/isSignedIn/user refs so the store stays in sync
 * regardless of how the user arrived (login, direct URL, back/forward).
 * A .client.ts plugin because Clerk's useUser() is only meaningful on the client.
 */
export default defineNuxtPlugin(() => {
  const { isLoaded, isSignedIn, user } = useUser()
  const userStore = useUserStore()

  watch(
    [isLoaded, isSignedIn, user],
    async ([loaded, signedIn, clerkUser]) => {
      if (!loaded) return

      if (signedIn && clerkUser) {
        userStore.hydrate(clerkUser.publicMetadata as Record<string, unknown>)
        if (!userStore.personContact) {
          await userStore.loadPersonContact()
        }
      } else {
        userStore.reset()
      }
    },
    { immediate: true },
  )
})
