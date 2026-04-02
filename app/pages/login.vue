<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- Shared: email entry point -->
      <template v-if="step === 'email'">
        <h1>Welcome</h1>
        <p class="subtitle">Enter your email to continue</p>

        <form @submit.prevent="handleEmail">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" placeholder="you@example.com" required />
          </div>

          <!--
            CAPTCHA mount point required by Clerk when signUp.create() is called.
            Fast-track registration calls startSignUp() from this step, so it must
            be present here as well as on the form step.
          -->
          <div id="clerk-captcha" />

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Checking…' : 'Continue' }}
          </button>
        </form>
      </template>

      <!-- Registration: collect profile details -->
      <template v-else-if="step === 'form'">
        <h1>Tell us about yourself</h1>
        <p class="subtitle">We need a few more details to set up your account</p>

        <form @submit.prevent="handleForm">
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
            <input id="jobTitle" v-model="jobTitle" type="text" placeholder="Operations Manager" required />
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

          <div id="clerk-captcha" />

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Sending code…' : 'Continue' }}
          </button>
        </form>

        <p class="switch">
          <button class="link-btn" @click="step = 'email'">Go back</button>
        </p>
      </template>

      <!-- Registration: verify email OTP -->
      <template v-else-if="step === 'otp'">
        <h1>Check your email</h1>
        <p class="subtitle">We sent a code to <strong>{{ email }}</strong></p>

        <form @submit.prevent="handleOtp">
          <div class="field">
            <label for="otp-code">Verification code</label>
            <input
              id="otp-code"
              v-model="otpCode"
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
          <button class="link-btn" @click="step = fastTrack ? 'email' : 'form'">Go back</button>
        </p>
      </template>

      <!-- Login: enter existing password -->
      <template v-else-if="step === 'password'">
        <h1>Log in</h1>
        <p class="subtitle">{{ email }}</p>

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

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Logging in…' : 'Log in' }}
          </button>
        </form>

        <p class="switch">
          <button class="link-btn" @click="step = 'email'">← Back</button>
          &nbsp;·&nbsp;
          <NuxtLink to="/forgot-password">Forgot password?</NuxtLink>
        </p>
      </template>

      <!-- Registration: set new password -->
      <template v-else-if="step === 'set-password'">
        <h1>Set a password</h1>
        <p class="subtitle">Choose a password for your account</p>

        <form @submit.prevent="handleSetPassword">
          <div class="field">
            <label for="new-password">Password</label>
            <input id="new-password" v-model="newPassword" type="password" placeholder="••••••••" required />
          </div>

          <div class="field">
            <label for="confirm-password">Confirm password</label>
            <input id="confirm-password" v-model="confirmPassword" type="password" placeholder="••••••••" required />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
      </template>

      <!-- Login: 2FA second factor -->
      <template v-else-if="step === 'second-factor'">
        <h1>Check your email</h1>
        <p class="subtitle">We sent a code to {{ pendingSecondFactor?.safeIdentifier }}</p>

        <form @submit.prevent="handleSecondFactor">
          <div class="field">
            <label for="verify-code">Verification code</label>
            <input
              id="verify-code"
              v-model="verifyCode"
              type="text"
              inputmode="numeric"
              placeholder="123456"
              required
              autocomplete="one-time-code"
            />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Verifying…' : 'Verify' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  const route = useRoute()
  const {
    isLoaded,
    isSignedIn,
    error,
    loading,
    pendingSecondFactor,
    identifyEmail,
    login,
    submitSecondFactor,
    checkRegistration,
    startSignUp,
    verifyEmail,
    createPersonAfterVerify,
    completeSignUp,
  } = useClerkAuth()

  const clerk = useClerk()

  const step = ref<'email' | 'form' | 'otp' | 'password' | 'set-password' | 'second-factor'>('email')
  const email = ref('')

  // Login state
  const password = ref('')
  const verifyCode = ref('')

  // Registration state
  const firstName = ref('')
  const lastName = ref('')
  const jobTitle = ref('')
  const company = ref('')
  const town = ref('')
  const country = ref('United Kingdom')
  const existingPersonId = ref<number | null>(null)
  const fastTrack = ref(false)
  const otpCode = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')

  const redirectTo = computed(() => (route.query.redirect as string) || '/')

  // If already signed in (e.g. arriving from a satellite redirect), just redirect.
  // buildUrlWithAuth appends ?__clerk_db_jwt for satellite session sync on shared-parent domains.
  watchEffect(() => {
    if (isLoaded.value && isSignedIn.value) {
      const isExternal = redirectTo.value.startsWith('http')
      const destination = isExternal ? clerk.value!.buildUrlWithAuth(redirectTo.value) : redirectTo.value
      navigateTo(destination, { external: isExternal })
    }
  })

  // ── Shared ─────────────────────────────────────────────────────────────────

  async function handleEmail() {
    const result = await identifyEmail(email.value)
    if (result === true) {
      step.value = 'password'
    } else if (result === 'register') {
      const reg = await checkRegistration(email.value)
      if (!reg) return
      fastTrack.value = reg.fastTrack
      existingPersonId.value = reg.existingPersonId
      if (reg.town) town.value = reg.town
      if (reg.country) country.value = reg.country
      if (reg.fastTrack) {
        const ok = await startSignUp(email.value)
        if (ok) step.value = 'otp'
      } else {
        step.value = 'form'
      }
    }
    // false → navigated to /password-reset-required
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async function handlePassword() {
    const needsVerify = await login(email.value, password.value, redirectTo.value)
    if (needsVerify) step.value = 'second-factor'
  }

  async function handleSecondFactor() {
    await submitSecondFactor(verifyCode.value)
  }

  // ── Registration ───────────────────────────────────────────────────────────

  async function handleForm() {
    const ok = await startSignUp(email.value)
    if (ok) step.value = 'otp'
  }

  async function handleOtp() {
    const result = await verifyEmail(otpCode.value)
    if (result === 'password') {
      if (existingPersonId.value === null) {
        const personId = await createPersonAfterVerify({
          email: email.value,
          firstName: firstName.value || undefined,
          lastName: lastName.value || undefined,
          jobTitle: jobTitle.value || undefined,
          companyName: company.value || undefined,
          town: town.value || undefined,
          country: country.value || undefined,
        })
        if (personId !== null) existingPersonId.value = personId
      }
      step.value = 'set-password'
    }
  }

  async function handleSetPassword() {
    await completeSignUp(newPassword.value, confirmPassword.value, {
      existingPersonId: existingPersonId.value,
      town: town.value || undefined,
      country: country.value || undefined,
    }, redirectTo.value)
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
    max-width: 560px;
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
