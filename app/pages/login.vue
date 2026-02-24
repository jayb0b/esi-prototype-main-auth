<template>
  <div class="auth-page">
    <div class="auth-card">

      <!-- Step 1: identify the email address -->
      <template v-if="step === 'email'">
        <h1>Log in</h1>
        <p class="subtitle">Welcome back</p>

        <form @submit.prevent="handleEmail">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" placeholder="you@example.com" required />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" :disabled="loading" class="btn-submit">
            {{ loading ? 'Checking…' : 'Continue' }}
          </button>
        </form>

        <p class="switch">
          Don't have an account? <NuxtLink to="/register">Get started</NuxtLink>
        </p>
      </template>

      <!-- Step 2: enter password for the identified account -->
      <template v-else-if="step === 'password'">
        <h1>Log in</h1>
        <p class="subtitle">{{ email }}</p>

        <form @submit.prevent="handlePassword">
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
          <button class="link-btn" @click="step = 'email'">← Back</button>
        </p>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { error, loading, identifyEmail, login } = useClerkAuth()

const step = ref<'email' | 'password'>('email')
const email = ref('')
const password = ref('')

const redirectTo = computed(() => (route.query.redirect as string) || '/')

async function handleEmail() {
  const showPassword = await identifyEmail(email.value)
  if (showPassword) step.value = 'password'
}

async function handlePassword() {
  await login(email.value, password.value, redirectTo.value)
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
