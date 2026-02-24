<template>
  <div class="auth-page">
    <div class="auth-card">

      <!-- Step 0: sending the OTP automatically -->
      <template v-if="step === 'start'">
        <h1>Password reset required</h1>
        <p class="subtitle">
          Your account has been migrated to our new platform. For your security, you must
          verify your email address and set a new password before continuing.
        </p>

        <p v-if="loading" class="sending">
          Sending a verification code to <strong>{{ userEmail }}</strong>…
        </p>

        <template v-if="error">
          <p class="error">{{ error }}</p>
          <button :disabled="loading" class="btn-submit" @click="initReset">
            {{ loading ? 'Sending…' : 'Retry' }}
          </button>
        </template>
      </template>

      <!-- Step 1: enter OTP -->
      <template v-else-if="step === 'verify'">
        <h1>Check your email</h1>
        <p class="subtitle">
          We sent a code to <strong>{{ userEmail }}</strong>.
        </p>

        <form @submit.prevent="handleVerify">
          <div class="field">
            <label for="code">Verification code</label>
            <input
              id="code"
              v-model="code"
              type="text"
              inputmode="numeric"
              placeholder="123456"
              autocomplete="one-time-code"
              required
            />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Verifying…' : 'Verify' }}
          </button>
        </form>
      </template>

      <!-- Step 2: set new password -->
      <template v-else-if="step === 'password'">
        <h1>Set a new password</h1>
        <p class="subtitle">Choose a new password for your account.</p>

        <form @submit.prevent="handlePassword">
          <div class="field">
            <label for="password">New password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <div class="field">
            <label for="confirm">Confirm password</label>
            <input
              id="confirm"
              v-model="confirm"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Saving…' : 'Set new password' }}
          </button>
        </form>
      </template>

      <!-- Step 3: done -->
      <template v-else-if="step === 'done'">
        <h1>You're all set</h1>
        <p class="subtitle">Your new password has been saved. Welcome to the new platform.</p>
        <NuxtLink to="/" class="btn-primary">Continue</NuxtLink>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Password Reset Required page (/password-reset-required).
 *
 * Shown to migrated users (publicMetadata.migrated === true) after sign-in.
 * Forces email verification BEFORE allowing a password change, preventing
 * an attacker who only has the old compromised password from locking out the
 * real account owner.
 *
 * Session handling:
 *   login.vue signs the user out and stashes their email in sessionStorage
 *   before navigating here, so this page always loads with no active Clerk
 *   session. That is a prerequisite for starting a reset_password_email_code
 *   flow — Clerk rejects signIn.create() if a session already exists.
 *   The email is read and immediately removed from sessionStorage on setup.
 *
 * Flow:
 *  start    → onMounted fires initReset() automatically
 *           → OTP sent; step advances to 'verify'
 *           → on failure: error + Retry button shown, step stays 'start'
 *  verify   → user enters OTP → attemptFirstFactor → status 'needs_new_password'
 *  password → user sets new password → resetPassword → setActive (new session)
 *           → POST /api/clear-migrated to remove the migration flag
 *  done     → user continues to app
 */
const { user } = useUser()
const { signIn, setActive } = useSignIn()
const userStore = useUserStore()

const step = ref<'start' | 'verify' | 'password' | 'done'>('start')
const code = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)

// Read the email stored by login.vue before it signed out and navigated here.
// sessionStorage is always available here because login.vue navigates client-side
// (no full page reload), so this setup code runs in the browser.
const storedEmail = sessionStorage.getItem('migrationEmail') ?? ''
sessionStorage.removeItem('migrationEmail')
const userEmail = ref(storedEmail || user.value?.primaryEmailAddress?.emailAddress || '')

/**
 * Sends the password-reset OTP.
 * No sign-out needed — login.vue already signed the user out before navigating here.
 * Called automatically on mount; the retry button calls it again on failure.
 */
async function initReset() {
  error.value = ''
  loading.value = true
  try {
    await signIn.value!.create({
      strategy: 'reset_password_email_code',
      identifier: userEmail.value,
    })
    step.value = 'verify'
  } catch (err) {
    error.value =
      (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? 'Could not send code.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initReset()
})

/** Verifies the OTP. On success Clerk returns status 'needs_new_password'. */
async function handleVerify() {
  error.value = ''
  loading.value = true
  try {
    const result = await signIn.value!.attemptFirstFactor({
      strategy: 'reset_password_email_code',
      code: code.value,
    })
    if (result.status === 'needs_new_password') {
      step.value = 'password'
    }
  } catch (err) {
    error.value =
      (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? 'Invalid code.'
  } finally {
    loading.value = false
  }
}

/** Sets the new password, activates the fresh session, clears the migration flag. */
async function handlePassword() {
  error.value = ''
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    const result = await signIn.value!.resetPassword({ password: password.value })
    if (result.status === 'complete') {
      await setActive.value!({ session: result.createdSessionId })
      await $fetch('/api/clear-migrated', { method: 'POST' })
      userStore.hydrate({ ...user.value?.publicMetadata, migrated: false })
      step.value = 'done'
    }
  } catch (err) {
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
  background: #f9fafb;
}

.auth-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.subtitle {
  color: #6b7280;
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.sending {
  font-size: 0.9rem;
  color: #374151;
  margin: 0 0 1.5rem;
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
</style>
