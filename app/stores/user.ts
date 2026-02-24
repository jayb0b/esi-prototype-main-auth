import { defineStore } from 'pinia'

/**
 * User store — holds application-level user state that goes beyond what
 * Clerk's useUser() provides directly, such as server-side role information
 * read from publicMetadata and any preferences loaded after sign-in.
 *
 * Kept separate from Clerk's own reactive state so that non-auth concerns
 * (roles, preferences, UI state) have a clear home and can be reset cleanly
 * on sign-out without touching the Clerk session.
 */
export const useUserStore = defineStore('user', () => {
  /** Roles assigned server-side via publicMetadata after sign-up completion. */
  const roles = ref<string[]>([])

  /** True once the store has been hydrated from Clerk's user object. */
  const hydrated = ref(false)

  /**
   * Populates the store from Clerk's publicMetadata.
   * Call this after sign-in or on app load when a session already exists.
   */
  function hydrate(publicMetadata: Record<string, unknown>) {
    roles.value = (publicMetadata.roles as string[]) ?? []
    hydrated.value = true
  }

  /** Clears all user state — call on sign-out. */
  function reset() {
    roles.value = []
    hydrated.value = false
  }

  const isUser = computed(() => roles.value.includes('ROLE_USER'))

  return { roles, hydrated, isUser, hydrate, reset }
})
