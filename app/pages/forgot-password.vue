<template>
  <div class="auth-page">
    <div class="auth-card">

      <!-- Step 1: enter email address -->
      <template v-if="step === 'email'">
        <h1>Forgot password?</h1>
        <p class="subtitle">Enter your email and we'll send you a reset code.</p>

        <form @submit.prevent="handleEmail">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" placeholder="you@example.com" required />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Sending…' : 'Send reset code' }}
          </button>
        </form>

        <p class="switch">
          <NuxtLink to="/login">← Back to log in</NuxtLink>
        </p>
      </template>

      <!-- Step 2: enter OTP -->
      <template v-else-if="step === 'verify'">
        <h1>Check your email</h1>
        <p class="subtitle">We sent a reset code to <strong>{{ email }}</strong>.</p>

        <form @submit.prevent="handleVerify">
          <div class="field">
            <label for="code">Reset code</label>
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
          <button class="link-btn" @click="step = 'email'">← Try a different email</button>
        </p>
      </template>

      <!-- Step 3: set new password -->
      <template v-else-if="step === 'password'">
        <h1>Set a new password</h1>
        <p class="subtitle">Choose a strong password for your account.</p>

        <form @submit.prevent="handlePassword">
          <div class="field">
            <label for="password">New password</label>
            <input id="password" v-model="password" type="password" placeholder="••••••••" required />
          </div>

          <div class="field">
            <label for="confirm">Confirm password</label>
            <input id="confirm" v-model="confirm" type="password" placeholder="••••••••" required />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Saving…' : 'Set new password' }}
          </button>
        </form>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
const { error, loading, startPasswordReset, verifyPasswordReset, completeForgotPasswordReset } = useClerkAuth()

const step = ref<'email' | 'verify' | 'password'>('email')
const email = ref('')
const code = ref('')
const password = ref('')
const confirm = ref('')

async function handleEmail() {
  const ok = await startPasswordReset(email.value)
  if (ok) step.value = 'verify'
}

async function handleVerify() {
  const ok = await verifyPasswordReset(code.value)
  if (ok) step.value = 'password'
}

async function handlePassword() {
  await completeForgotPasswordReset(password.value, confirm.value)
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
  line-height: 1.5;
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
