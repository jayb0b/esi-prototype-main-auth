<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- Step 1: collect email and company name -->
      <template v-if="step === 'details'">
        <h1>Get started</h1>
        <p class="subtitle">Create your account</p>

        <form @submit.prevent="handleDetails">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" placeholder="you@example.com" required />
          </div>

          <div class="field-row">
            <div class="field">
              <label for="firstName">First name</label>
              <input id="firstName" v-model="firstName" type="text" placeholder="Jane" required />
            </div>
            <div class="field">
              <label for="lastName">Last name</label>
              <input id="lastName" v-model="lastName" type="text" placeholder="Smith" required />
            </div>
          </div>

          <div class="field">
            <label for="jobTitle">Job title</label>
            <input
              id="jobTitle"
              v-model="jobTitle"
              type="text"
              placeholder="Operations Manager"
              required
            />
          </div>

          <div class="field">
            <label for="company">Company name</label>
            <input id="company" v-model="company" type="text" placeholder="Acme Ltd" required />
          </div>

          <div class="field">
            <label for="town">Town</label>
            <input id="town" v-model="town" type="text" placeholder="Manchester" required />
          </div>

          <div class="field">
            <label for="country">Country</label>
            <CountrySelect id="country" v-model="country" required />
          </div>

          <!--
            Required mount point for Clerk's CAPTCHA widget on custom sign-up flows.
            Clerk mounts a Smart CAPTCHA here for bot protection. Without this element
            it falls back to invisible mode, which can cause sign-up 400 errors.
            See: https://clerk.com/docs/guides/development/custom-flows/bot-sign-up-protection
          -->
          <div id="clerk-captcha" />

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Sending code…' : 'Continue' }}
          </button>
        </form>

        <p class="switch">Already have an account? <NuxtLink to="/login">Log in</NuxtLink></p>
      </template>

      <!-- Step 2: verify email ownership via OTP -->
      <template v-else-if="step === 'verify'">
        <h1>Check your email</h1>
        <p class="subtitle">
          We sent a code to <strong>{{ email }}</strong>
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

        <p class="switch">
          <button class="link-btn" @click="step = 'details'">Go back</button>
        </p>
      </template>

      <!-- Step 3: set account password -->
      <template v-else-if="step === 'password'">
        <h1>Set a password</h1>
        <p class="subtitle">Choose a password for your account</p>

        <form @submit.prevent="handlePassword">
          <div class="field">
            <label for="password">Password</label>
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
            <input id="confirm" v-model="confirm" type="password" placeholder="••••••••" required />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  /**
   * Registration page — three-step custom sign-up flow using Clerk.
   *
   * Step 1 — Details (step === 'details'):
   *   Collect email and company name. Company name is stored in Clerk's
   *   unsafeMetadata (client-writable; not suitable for authorisation).
   *   A CAPTCHA widget is mounted here for bot protection.
   *   On submit: creates the Clerk sign-up record and sends an OTP to the email.
   *
   * Step 2 — Verify (step === 'verify'):
   *   User enters the 6-digit OTP from their email.
   *   On success: Clerk returns status 'missing_requirements' (password not yet
   *   set) which advances to step 3, or 'complete' if no further requirements.
   *
   * Step 3 — Password (step === 'password'):
   *   User sets and confirms their password.
   *   On submit:
   *     1. signUp.update() finalises the sign-up (status becomes 'complete').
   *     2. setActive() writes the session cookie.
   *     3. POST /api/complete-signup is called server-side to stamp
   *        publicMetadata (roles, verified flag) onto the user via the
   *        Clerk Backend SDK. publicMetadata is server-only and trusted for
   *        authorisation checks.
   *     4. User is redirected to the homepage.
   *
   * Clerk composable notes:
   *  - signUp  — ComputedRef<SignUpResource | undefined>; access via .value.
   *  - setActive — ComputedRef<SetActive | undefined>; access via .value.
   */

  const { signUp, setActive } = useSignUp()
  const clerk = useClerk()
  const userStore = useUserStore()

  const step = ref<'details' | 'verify' | 'password'>('details')

  const email = ref('')
  const firstName = ref('')
  const lastName = ref('')
  const jobTitle = ref('')
  const company = ref('')
  const town = ref('')
  const country = ref('United Kingdom')
  const code = ref('')
  const password = ref('')
  const confirm = ref('')
  const error = ref('')
  const loading = ref(false)

  /**
   * Step 1 handler.
   * Creates the Clerk sign-up record and sends an email OTP.
   * companyName is stored in unsafeMetadata for display/onboarding purposes only.
   */
  async function handleDetails() {
    error.value = ''
    loading.value = true
    try {
      await signUp.value!.create({
        emailAddress: email.value,
        // unsafeMetadata: {
        //   // TODO: move to SQL; unsafeMetadata is client-writable and not authoritative
        //   firstName: firstName.value,
        //   lastName: lastName.value,
        //   jobTitle: jobTitle.value,
        //   companyName: company.value,
        //   town: town.value,
        //   country: country.value,
        // },
      })
      // Request a one-time passcode be sent to the provided email address.
      await signUp.value!.prepareEmailAddressVerification({ strategy: 'email_code' })
      step.value = 'verify'
    } catch (err) {
      error.value =
        (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? 'Something went wrong.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Step 2 handler.
   * Submits the OTP entered by the user to Clerk for verification.
   * 'missing_requirements' means email is verified but password is still needed.
   * 'complete' means the sign-up finished without a password step (unlikely with
   *  current Clerk config but handled for safety).
   */
  async function handleVerify() {
    error.value = ''
    loading.value = true
    try {
      const result = await signUp.value!.attemptEmailAddressVerification({ code: code.value })
      if (result.status === 'missing_requirements') {
        step.value = 'password'
      } else if (result.status === 'complete') {
        await setActive.value!({ session: result.createdSessionId })
        await navigateTo('/')
      }
    } catch (err) {
      error.value =
        (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? 'Invalid code.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Step 3 handler.
   * Sets the user's password to complete the sign-up, then activates the session
   * and calls the server to assign initial roles via publicMetadata.
   */
  async function handlePassword() {
    error.value = ''
    if (password.value !== confirm.value) {
      error.value = 'Passwords do not match.'
      return
    }
    loading.value = true
    try {
      const result = await signUp.value!.update({ password: password.value })
      if (result.status === 'complete') {
        // Activate the session before calling the API so the cookie is present.
        await setActive.value!({ session: result.createdSessionId })

        // Server-side: stamps publicMetadata.roles on the user record.
        // Must be called after setActive so the session cookie is sent with the request.
        await $fetch('/api/complete-signup', { method: 'POST' })

        // Reload the Clerk user so publicMetadata reflects what the server just wrote,
        // then hydrate the store from the fresh values.
        await clerk.value?.user?.reload()
        userStore.hydrate(clerk.value?.user?.publicMetadata ?? {})

        await navigateTo('/')
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
    font-family: system-ui, sans-serif;
    background: #f9fafb;
  }

  .auth-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 2.5rem;
    width: 100%;
    max-width: 600px;
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

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
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

  select {
    padding: 0.6rem 0.85rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    outline: none;
    background: #fff;
    transition: border-color 0.15s;
  }

  select:focus {
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

  .switch a,
  .link-btn {
    color: #111827;
    font-weight: 500;
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0;
  }
</style>
