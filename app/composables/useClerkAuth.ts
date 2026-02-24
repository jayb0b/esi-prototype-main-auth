/**
 * useClerkAuth — single source of truth for all Clerk interactions.
 *
 * Named to avoid collision with @clerk/nuxt's own `useAuth` (which exposes
 * session state). Pages own their form-field and UI step state; this
 * composable owns every Clerk API call, session activation, store hydration,
 * and navigation that results from them.
 */
export function useClerkAuth() {
  const { signIn, setActive: setActiveSignIn } = useSignIn()
  const { signUp, setActive: setActiveSignUp } = useSignUp()
  const { isLoaded, isSignedIn, user } = useUser()
  const clerk = useClerk()
  const userStore = useUserStore()

  const error = ref('')
  const loading = ref(false)

  function clerkError(err: unknown, fallback: string): string {
    return (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? fallback
  }

  // ── Sign-in ────────────────────────────────────────────────────────────────

  /**
   * Checks whether an email exists in Clerk and determines the next login step.
   * Returns true if the password field should be shown.
   * Navigates away (and returns false) for the other two cases:
   *  - Unknown email  → stores email in sessionStorage, redirects to /register
   *  - Migrated user  → stores email in sessionStorage, redirects to /password-reset-required
   */
  async function identifyEmail(email: string): Promise<boolean> {
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch('/api/check-email', { method: 'POST', body: { email } }) as
        { exists: false } | { exists: true; migrated: boolean }

      if (!result.exists) {
        sessionStorage.setItem('registrationEmail', email)
        await navigateTo('/register')
        return false
      }

      if (result.migrated) {
        sessionStorage.setItem('migrationEmail', email)
        await navigateTo('/password-reset-required')
        return false
      }

      return true
    } catch (err) {
      error.value = clerkError(err, 'Something went wrong.')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Authenticates with email + password, then redirects to `redirectTo`.
   * Migrated users are signed out and routed to /password-reset-required
   * instead; their email is stashed in sessionStorage for that page to pick up.
   */
  async function login(email: string, password: string, redirectTo: string = '/') {
    error.value = ''
    loading.value = true
    try {
      const attempt = await signIn.value!.create({ identifier: email, password })

      if (attempt.status === 'complete') {
        await setActiveSignIn.value!({ session: attempt.createdSessionId })
        userStore.hydrate(user.value?.publicMetadata ?? {})

        if (user.value?.publicMetadata?.migrated === true) {
          const migrationEmail = user.value?.primaryEmailAddress?.emailAddress ?? email
          userStore.reset()
          sessionStorage.setItem('migrationEmail', migrationEmail)
          await clerk.value?.signOut()
          await navigateTo('/password-reset-required')
          return
        }

        const isExternal = redirectTo.startsWith('http')
        await navigateTo(redirectTo, { external: isExternal })
      } else {
        error.value = `Sign-in incomplete (status: ${attempt.status})`
      }
    } catch (err) {
      error.value = clerkError(err, 'Something went wrong.')
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    await clerk.value?.signOut()
    userStore.reset()
    await navigateTo('/')
  }

  // ── Registration (3 steps) ─────────────────────────────────────────────────

  /** Creates the sign-up record and sends an email OTP. */
  async function startSignUp(email: string): Promise<boolean> {
    error.value = ''
    loading.value = true
    try {
      await signUp.value!.create({ emailAddress: email })
      await signUp.value!.prepareEmailAddressVerification({ strategy: 'email_code' })
      return true
    } catch (err) {
      error.value = clerkError(err, 'Something went wrong.')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Verifies the email OTP.
   * Returns 'password' if a password is still required, 'complete' if the
   * sign-up finished without one, or null on error.
   */
  async function verifyEmail(code: string): Promise<'password' | 'complete' | null> {
    error.value = ''
    loading.value = true
    try {
      const result = await signUp.value!.attemptEmailAddressVerification({ code })
      if (result.status === 'missing_requirements') return 'password'
      if (result.status === 'complete') {
        await setActiveSignUp.value!({ session: result.createdSessionId })
        await navigateTo('/')
        return 'complete'
      }
      return null
    } catch (err) {
      error.value = clerkError(err, 'Invalid code.')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Sets the password to finalise sign-up, then calls /api/complete-signup
   * server-side to stamp publicMetadata before redirecting home.
   */
  async function completeSignUp(password: string, confirmPassword: string): Promise<boolean> {
    error.value = ''
    if (password !== confirmPassword) {
      error.value = 'Passwords do not match.'
      return false
    }
    loading.value = true
    try {
      const result = await signUp.value!.update({ password })
      if (result.status === 'complete') {
        await setActiveSignUp.value!({ session: result.createdSessionId })
        await $fetch('/api/complete-signup', { method: 'POST' })
        await clerk.value?.user?.reload()
        userStore.hydrate(clerk.value?.user?.publicMetadata ?? {})
        await navigateTo('/')
        return true
      }
      return false
    } catch (err) {
      error.value = clerkError(err, 'Something went wrong.')
      return false
    } finally {
      loading.value = false
    }
  }

  // ── Migrated-user password reset (3 steps) ─────────────────────────────────

  /** Sends a reset_password_email_code OTP to the given address. */
  async function startPasswordReset(email: string): Promise<boolean> {
    error.value = ''
    loading.value = true
    try {
      await signIn.value!.create({ strategy: 'reset_password_email_code', identifier: email })
      return true
    } catch (err) {
      error.value = clerkError(err, 'Could not send code.')
      return false
    } finally {
      loading.value = false
    }
  }

  /** Verifies the OTP. Returns true when Clerk requires a new password. */
  async function verifyPasswordReset(code: string): Promise<boolean> {
    error.value = ''
    loading.value = true
    try {
      const result = await signIn.value!.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      })
      return result.status === 'needs_new_password'
    } catch (err) {
      error.value = clerkError(err, 'Invalid code.')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Resets the password, activates the new session, then calls
   * /api/clear-migrated to remove the migration flag from publicMetadata.
   */
  async function completePasswordReset(password: string, confirmPassword: string): Promise<boolean> {
    error.value = ''
    if (password !== confirmPassword) {
      error.value = 'Passwords do not match.'
      return false
    }
    loading.value = true
    try {
      const result = await signIn.value!.resetPassword({ password })
      if (result.status === 'complete') {
        await setActiveSignIn.value!({ session: result.createdSessionId })
        await $fetch('/api/clear-migrated', { method: 'POST' })
        userStore.hydrate({ ...user.value?.publicMetadata, migrated: false })
        return true
      }
      return false
    } catch (err) {
      error.value = clerkError(err, 'Something went wrong.')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    isLoaded, isSignedIn, user,
    error, loading,
    identifyEmail, login, signOut,
    startSignUp, verifyEmail, completeSignUp,
    startPasswordReset, verifyPasswordReset, completePasswordReset,
  }
}
