<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Log in</h1>
      <p class="subtitle">Welcome back</p>

      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" placeholder="you@example.com" required />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" placeholder="••••••••" required />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" :disabled="loading" class="btn-submit">
          {{ loading ? 'Logging in…' : 'Log in' }}
        </button>
      </form>

      <p class="switch">
        Don't have an account? <NuxtLink to="/register">Get started</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Login page — email + password sign-in via Clerk's custom flow.
 *
 * Supports an optional `redirect` query parameter containing the URL to send
 * the user to after a successful sign-in. This is used by satellite pages
 * (e.g. /info) that want to return the user to their original location rather
 * than the homepage. The value can be an absolute URL (cross-domain satellite
 * sites) or a relative path.
 *
 * Flow:
 *  1. User submits email + password.
 *  2. signIn.create() attempts authentication against Clerk.
 *  3. On success (status === 'complete'), setActive() writes the session cookie.
 *  4a. If publicMetadata.migrated === true: store the email in sessionStorage,
 *      sign out, then navigate to /password-reset-required. Signing out here
 *      (before navigation) ensures that page always loads without an active
 *      session, which is required to start a reset_password_email_code flow.
 *  4b. Otherwise: navigateTo() redirects to the `redirect` query param or '/'.
 *      For absolute URLs, { external: true } is required so Nuxt performs a
 *      full browser navigation instead of a client-side route change.
 */

// signIn — ComputedRef<SignInResource | undefined>. Access via .value.
// setActive — ComputedRef<SetActive | undefined>. Access via .value.
const { signIn, setActive } = useSignIn()
const { user } = useUser()
const clerk = useClerk()
const route = useRoute()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

/**
 * The post-login destination. Reads the `redirect` query param (set by pages
 * that link to /login with a return URL), falling back to the homepage.
 */
const redirectTo = computed(() => (route.query.redirect as string) || '/')

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const attempt = await signIn.value!.create({ identifier: email.value, password: password.value })

    if (attempt.status === 'complete') {
      // Write the Clerk session cookie so subsequent requests are authenticated.
      await setActive.value!({ session: attempt.createdSessionId })

      // Hydrate the store from publicMetadata now that the session is active.
      userStore.hydrate(user.value?.publicMetadata ?? {})

      // Migrated users must set a new password before continuing.
      // Sign out here, before navigating, so the reset page always arrives
      // without an active session — Clerk refuses to start a
      // reset_password_email_code flow while one exists. The email is stashed
      // in sessionStorage (not the URL) so it survives the navigation without
      // being visible in the address bar or browser history.
      if (user.value?.publicMetadata?.migrated === true) {
        const migrationEmail =
          user.value?.primaryEmailAddress?.emailAddress ?? email.value
        userStore.reset()
        sessionStorage.setItem('migrationEmail', migrationEmail)
        await clerk.value?.signOut()
        await navigateTo('/password-reset-required')
        return
      }

      // Absolute URLs (satellite sites) need external: true; relative paths do not.
      const isExternal = redirectTo.value.startsWith('http')
      await navigateTo(redirectTo.value, { external: isExternal })
    }
  } catch (err) {
    // Clerk errors carry an `errors` array. Surface the first message to the user.
    error.value =
      (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? 'Something went wrong.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui, sans-serif;
  background: #f9fafb;
}

.auth-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.subtitle {
  color: #6b7280;
  margin: 0 0 2rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
}

label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

input {
  padding: 0.6rem 0.85rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.15s;
}

input:focus {
  border-color: #111827;
}

.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0 0 1rem;
}

.btn-submit {
  width: 100%;
  background: #111827;
  color: #fff;
  border: none;
  padding: 0.7rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 0.5rem;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
}

.switch a {
  color: #111827;
  font-weight: 500;
  text-decoration: none;
}
</style>
