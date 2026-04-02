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
export interface PersonContact {
  id: number
  email: string | null
  firstName: string | null
  lastName: string | null
  jobTitle: string | null
  companyName: string | null
  town: string | null
  country: string | null
  clerkId: string | null
}

export const useUserStore = defineStore('user', () => {
  /** Roles assigned server-side via publicMetadata after sign-up completion. */
  const roles = ref<string[]>([])

  /** True once the store has been hydrated from Clerk's user object. */
  const hydrated = ref(false)

  /** Person contact record from the content API. */
  const personContact = ref<PersonContact | null>(null)

  /**
   * Populates the store from Clerk's publicMetadata.
   * Call this after sign-in or on app load when a session already exists.
   */
  function hydrate(publicMetadata: Record<string, unknown>) {
    roles.value = (publicMetadata.roles as string[]) ?? []
    hydrated.value = true
  }

  /** Fetches and stores the person contact record from the content API. */
  async function loadPersonContact() {
    try {
      personContact.value = await $fetch<PersonContact>('/api/person')
    } catch {
      personContact.value = null
    }
  }

  /** Clears all user state — call on sign-out. */
  function reset() {
    roles.value = []
    hydrated.value = false
    personContact.value = null
  }

  const isUser = computed(() => roles.value.includes('ROLE_USER'))

  return { roles, hydrated, isUser, personContact, hydrate, loadPersonContact, reset }
}, {
  persist: {
    storage: typeof window !== 'undefined' ? sessionStorage : undefined,
    pick: ['personContact'],
  },
})
