import type { SignInResource, SignInSecondFactor } from '@clerk/types'

/**
 * useClerkAuth — single source of truth for all Clerk interactions.
 *
 * Named to avoid collision with @clerk/nuxt's own `useAuth` (which exposes
 * raw session state). Pages own their form-field and UI step state; this
 * composable owns every Clerk API call, session activation, and navigation
 * that results from them.
 *
 * Store hydration is handled separately by the user-store.client.ts plugin,
 * which watches Clerk's reactive user state and stays in sync across all
 * navigations — including hard reloads and SSR.
 */
export function useClerkAuth() {
  const { signIn, setActive: setActiveSignIn } = useSignIn()
  const { signUp, setActive: setActiveSignUp } = useSignUp()
  const { isLoaded, isSignedIn, user } = useUser()
  const clerk = useClerk()
  const userStore = useUserStore()

  const error = ref('')
  const loading = ref(false)

  /**
   * State for Clerk's periodic email reverification (needs_second_factor).
   * Populated by login() when a second step is required; consumed by
   * submitSecondFactor(). pendingRedirect holds the original redirectTo
   * so navigation can complete after verification.
   */
  const pendingSecondFactor = ref<{ safeIdentifier: string; emailAddressId: string } | null>(null)
  const pendingRedirect = ref('')

  /** Extracts the first Clerk error message, falling back to `fallback`. */
  function clerkError(err: unknown, fallback: string): string {
    return (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? fallback
  }

  // ── Sign-in ────────────────────────────────────────────────────────────────

  /**
   * Checks whether an email exists in Clerk and determines the next step.
   *  - true       → known, non-migrated user; show password field
   *  - 'register' → unknown email; caller should start the registration flow
   *  - false      → migrated user; navigated to /password-reset-required
   */
  async function identifyEmail(email: string): Promise<true | 'register' | false> {
    email = email.trim().toLowerCase()
    error.value = ''
    loading.value = true
    try {
      const result = (await $fetch('/api/check-email', { method: 'POST', body: { email } })) as
        | { exists: false }
        | { exists: true; migrated: boolean }

      if (!result.exists) {
        return 'register'
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
   * Authenticates with email + password.
   * Returns true if Clerk requires a second-factor email code (periodic reverification).
   * Migrated users are signed out and routed to /password-reset-required instead.
   */
  async function login(
    email: string,
    password: string,
    redirectTo: string = '/'
  ): Promise<boolean> {
    email = email.trim().toLowerCase()
    error.value = ''
    loading.value = true
    try {
      const attempt = await signIn.value!.create({ identifier: email, password })

      if (attempt.status === 'complete') {
        return await activateSession(attempt, email, redirectTo)
      }

      if (attempt.status === 'needs_second_factor') {
        type EmailCodeFactor = Extract<SignInSecondFactor, { strategy: 'email_code' }>
        const factor = attempt.supportedSecondFactors?.find(
          (f): f is EmailCodeFactor => f.strategy === 'email_code'
        )
        if (factor) {
          await signIn.value!.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: factor.emailAddressId,
          })
          pendingSecondFactor.value = {
            safeIdentifier: factor.safeIdentifier ?? email,
            emailAddressId: factor.emailAddressId,
          }
          pendingRedirect.value = redirectTo
          return true
        }
      }

      error.value = `Sign-in incomplete (status: ${attempt.status})`
      return false
    } catch (err) {
      error.value = clerkError(err, 'Something went wrong.')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Submits the email verification code for Clerk's periodic reverification.
   * Should only be called after login() returns true (needs_second_factor).
   * Navigates to pendingRedirect on success.
   */
  async function submitSecondFactor(code: string): Promise<void> {
    error.value = ''
    loading.value = true
    try {
      const attempt = await signIn.value!.attemptSecondFactor({ strategy: 'email_code', code })
      if (attempt.status === 'complete') {
        await activateSession(attempt, '', pendingRedirect.value)
      } else {
        error.value = `Verification incomplete (status: ${attempt.status})`
      }
    } catch (err) {
      error.value = clerkError(err, 'Invalid code.')
    } finally {
      loading.value = false
    }
  }

  /**
   * Activates the Clerk session after a completed sign-in attempt.
   * Intercepts migrated users before they reach the app: signs them out,
   * stashes their email in sessionStorage, and routes to /password-reset-required.
   * All other users are navigated to redirectTo (supports external URLs).
   */
  async function activateSession(
    attempt: SignInResource,
    email: string,
    redirectTo: string
  ): Promise<boolean> {
    await setActiveSignIn.value!({ session: attempt.createdSessionId })

    if (user.value?.publicMetadata?.migrated === true) {
      const migrationEmail = user.value?.primaryEmailAddress?.emailAddress ?? email
      userStore.reset()
      sessionStorage.setItem('migrationEmail', migrationEmail)
      await clerk.value?.signOut()
      await navigateTo('/password-reset-required')
      return false
    }

    userStore.hydrate(user.value!.publicMetadata as Record<string, unknown>)
    await userStore.loadPersonContact()

    const isExternal = redirectTo.startsWith('http')
    // buildUrlWithAuth appends ?__clerk_db_jwt for satellite session sync on shared-parent domains
    const destination = isExternal ? clerk.value!.buildUrlWithAuth(redirectTo) : redirectTo
    await navigateTo(destination, { external: isExternal })
    return false
  }

  /** Signs out of Clerk, resets the user store, and navigates to /. */
  async function signOut() {
    await clerk.value?.signOut()
    userStore.reset()
    await navigateTo('/')
  }

  // ── Registration (4 steps) ─────────────────────────────────────────────────

  /**
   * Pre-step: checks email + IP to decide which registration path to take.
   * Returns { fastTrack, existingPersonId } or null on error.
   */
  async function checkRegistration(
    email: string
  ): Promise<{ fastTrack: boolean; existingPersonId: number | null; town: string | null; country: string | null } | null> {
    error.value = ''
    loading.value = true
    try {
      return await $fetch('/api/check-registration', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      })
    } catch (err) {
      error.value = clerkError(err, 'Something went wrong.')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Step 1: creates the Clerk sign-up record and sends an email OTP.
   * Returns true if the OTP was sent successfully.
   */
  async function startSignUp(email: string): Promise<boolean> {
    email = email.trim().toLowerCase()
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
   * Step 2: verifies the email OTP.
   * Returns 'password' if a password is still required, 'complete' if the
   * sign-up finished without one (unlikely with current Clerk config), or
   * null on error.
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
   * Step 2b: creates the person record in the content API immediately after
   * email verification, before the user has a session.
   *
   * Returns the new person's ID, or null on failure. Failure is non-fatal —
   * the caller should still proceed to the password step.
   */
  async function createPersonAfterVerify(data: {
    email: string
    firstName?: string
    lastName?: string
    jobTitle?: string
    companyName?: string
    town?: string
    country?: string
  }): Promise<number | null> {
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch<{ personId: number | null }>('/api/create-person-pre-auth', {
        method: 'POST',
        body: data,
      })
      return result.personId
    } catch (err) {
      error.value = clerkError(err, 'Could not save your details. You can still continue.')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Step 3: sets the password to finalise sign-up.
   * Activates the session, then calls /api/complete-signup to stamp ROLE_USER
   * onto publicMetadata and PATCH the person record (created at step 2b) with
   * the Clerk userId and geo-detected town/country.
   * Reloads the Clerk user so publicMetadata is fresh before navigating home.
   * Signs out and resets the store if anything fails after session activation.
   */
  async function completeSignUp(
    password: string,
    confirmPassword: string,
    registrationData: {
      existingPersonId?: number | null
      town?: string
      country?: string
    },
    redirectTo: string = '/'
  ): Promise<boolean> {
    error.value = ''
    if (password !== confirmPassword) {
      error.value = 'Passwords do not match.'
      return false
    }
    loading.value = true
    let sessionActivated = false
    try {
      const result = await signUp.value!.update({ password })
      if (result.status === 'complete') {
        await setActiveSignUp.value!({ session: result.createdSessionId })
        sessionActivated = true
        await $fetch('/api/complete-signup', { method: 'POST', body: registrationData })
        await clerk.value?.user?.reload()
        userStore.hydrate(user.value!.publicMetadata as Record<string, unknown>)
        await userStore.loadPersonContact()
        const isExternalReg = redirectTo.startsWith('http')
        // buildUrlWithAuth appends ?__clerk_db_jwt for satellite session sync on shared-parent domains
        const regDestination = isExternalReg ? clerk.value!.buildUrlWithAuth(redirectTo) : redirectTo
        await navigateTo(regDestination, { external: isExternalReg })
        return true
      }
      return false
    } catch (err) {
      if (sessionActivated) {
        await clerk.value?.signOut()
        userStore.reset()
      }
      error.value = clerkError(err, 'Something went wrong.')
      return false
    } finally {
      loading.value = false
    }
  }

  // ── Change password (authenticated) ───────────────────────────────────────

  /**
   * Changes the password for the currently signed-in user.
   * Returns true on success.
   */
  async function changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> {
    error.value = ''
    if (newPassword !== confirmPassword) {
      error.value = 'Passwords do not match.'
      return false
    }
    loading.value = true
    try {
      await clerk.value?.user?.updatePassword({ currentPassword, newPassword })
      return true
    } catch (err) {
      error.value = clerkError(err, 'Something went wrong.')
      return false
    } finally {
      loading.value = false
    }
  }

  // ── Password reset (3 steps) ───────────────────────────────────────────────
  //
  // Two entry points share steps 1 and 2:
  //   completeForgotPasswordReset — user-initiated forgot-password flow;
  //                                  clears the migrated flag if present,
  //                                  then navigates to /.
  //   completePasswordReset       — migrated-user forced reset flow; does not
  //                                  navigate (the page handles onward routing).

  /**
   * Step 1: sends a reset_password_email_code OTP to the given address.
   * Used by both the forgot-password and migrated-user reset flows.
   */
  async function startPasswordReset(email: string): Promise<boolean> {
    email = email.trim().toLowerCase()
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

  /**
   * Step 2: verifies the OTP.
   * Returns true when Clerk is ready to accept a new password (needs_new_password).
   * Used by both the forgot-password and migrated-user reset flows.
   */
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
   * Step 3 (forgot-password flow): resets the password and activates the session.
   * If the account has a migrated flag, calls /api/clear-migrated to remove it
   * so the user is treated as fully registered going forward.
   * Navigates to / on success.
   */
  async function completeForgotPasswordReset(
    password: string,
    confirmPassword: string
  ): Promise<boolean> {
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
        if (user.value?.publicMetadata?.migrated === true) {
          await $fetch('/api/clear-migrated', { method: 'POST' })
        }
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

  /**
   * Step 3 (migrated-user forced reset flow): resets the password, activates
   * the session, and calls /api/clear-migrated to remove the migration flag.
   * Does not navigate — the calling page handles onward routing.
   */
  async function completePasswordReset(
    password: string,
    confirmPassword: string
  ): Promise<boolean> {
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
    isLoaded,
    isSignedIn,
    user,
    error,
    loading,
    pendingSecondFactor,
    identifyEmail,
    login,
    signOut,
    submitSecondFactor,
    checkRegistration,
    startSignUp,
    verifyEmail,
    createPersonAfterVerify,
    completeSignUp,
    changePassword,
    startPasswordReset,
    verifyPasswordReset,
    completePasswordReset,
    completeForgotPasswordReset,
  }
}
