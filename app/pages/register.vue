<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- Step 1: email only -->
      <template v-if="step === 'email'">
        <h1>Get started</h1>
        <p class="subtitle">Create your account</p>

        <form @submit.prevent="handleEmail">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" placeholder="you@example.com" required />
          </div>

          <!--
            Required mount point for Clerk's CAPTCHA widget on custom sign-up flows.
            Must be present when signUp.create() is called (email step for fast-track).
          -->
          <div id="clerk-captcha" />

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Checking…' : 'Continue' }}
          </button>
        </form>

        <p class="switch">Already have an account? <NuxtLink :to="redirectTo !== '/' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'">Log in</NuxtLink></p>
      </template>

      <!-- Step 2 (full form path): collect profile details -->
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
            CAPTCHA mount point for the form step (full-form path).
            Only one step is rendered at a time via v-if, satisfying Clerk's
            requirement that #clerk-captcha is present when signUp.create() is called.
          -->
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

      <!-- Step 3: verify email ownership via OTP -->
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
          <button class="link-btn" @click="step = fastTrack ? 'email' : 'form'">Go back</button>
        </p>
      </template>

      <!-- Step 4: set account password -->
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
  const route = useRoute()
  const { error, loading, checkRegistration, startSignUp, verifyEmail, createPersonAfterVerify, completeSignUp } =
    useClerkAuth()

  const redirectTo = computed(() => (route.query.redirect as string) || '/')

  const step = ref<'email' | 'form' | 'verify' | 'password'>('email')

  const email = ref('')
  const fastTrack = ref(false)
  const existingPersonId = ref<number | null>(null)

  onMounted(() => {
    const stored = sessionStorage.getItem('registrationEmail')
    if (stored) {
      email.value = stored
      sessionStorage.removeItem('registrationEmail')
    }
  })

  const firstName = ref('')
  const lastName = ref('')
  const jobTitle = ref('')
  const company = ref('')
  const town = ref('')
  const country = ref('United Kingdom')
  const code = ref('')
  const password = ref('')
  const confirm = ref('')

  async function handleEmail() {
    const result = await checkRegistration(email.value)
    if (!result) return
    fastTrack.value = result.fastTrack
    existingPersonId.value = result.existingPersonId
    if (result.town) town.value = result.town
    if (result.country) country.value = result.country
    if (result.fastTrack) {
      const ok = await startSignUp(email.value)
      if (ok) step.value = 'verify'
    } else {
      step.value = 'form'
    }
  }

  async function handleForm() {
    const ok = await startSignUp(email.value)
    if (ok) step.value = 'verify'
  }

  async function handleVerify() {
    const result = await verifyEmail(code.value)
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
      step.value = 'password'
    }
  }

  async function handlePassword() {
    await completeSignUp(password.value, confirm.value, {
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
