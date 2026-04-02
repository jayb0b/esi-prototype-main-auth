<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <!-- Undetermined: Clerk hasn't hydrated yet -->
      <div v-if="!isLoaded" class="loading-state">
        <span class="spinner" />
      </div>

      <!-- Unauthenticated: show error -->
      <div v-else-if="!isSignedIn" class="error-state">
        <h1>Access denied</h1>
        <p>You must be logged in to view your profile.</p>
        <NuxtLink to="/login?redirect=/profile" class="btn-primary">Log in</NuxtLink>
      </div>

      <!-- Authenticated: show profile -->
      <template v-else>
        <h1>Your profile</h1>

        <div class="profile-card">
          <div class="profile-row">
            <span class="profile-label">Email</span>
            <span class="profile-value">{{ contact?.email || user?.primaryEmailAddress?.emailAddress || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">First name</span>
            <span class="profile-value">{{ contact?.firstName || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Last name</span>
            <span class="profile-value">{{ contact?.lastName || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Job title</span>
            <span class="profile-value">{{ contact?.jobTitle || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Company</span>
            <span class="profile-value">{{ contact?.companyName || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Town</span>
            <span class="profile-value">{{ contact?.town || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Country</span>
            <span class="profile-value">{{ contact?.country || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Roles</span>
            <span class="profile-value">
              <template v-if="userStore.roles.length">{{ userStore.roles.join(', ') }}</template>
              <template v-else>—</template>
            </span>
          </div>
        </div>

        <h2>Change password</h2>

        <form v-if="!passwordChanged" class="profile-card password-form" @submit.prevent="handleChangePassword">
          <div class="profile-row field-row">
            <label for="currentPassword">Current password</label>
            <input id="currentPassword" v-model="currentPassword" type="password" placeholder="••••••••" required />
          </div>
          <div class="profile-row field-row">
            <label for="newPassword">New password</label>
            <input id="newPassword" v-model="newPassword" type="password" placeholder="••••••••" required />
          </div>
          <div class="profile-row field-row">
            <label for="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" v-model="confirmPassword" type="password" placeholder="••••••••" required />
          </div>
          <div class="profile-row form-footer">
            <p v-if="passwordError" class="error">{{ passwordError }}</p>
            <button type="submit" :disabled="passwordLoading" class="btn-submit">
              {{ passwordLoading ? 'Saving…' : 'Update password' }}
            </button>
          </div>
        </form>

        <p v-else class="success">Password updated successfully.</p>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
  /**
   * Profile page (/profile).
   *
   * Authenticated users see their profile details drawn from:
   *  - userStore.personContact  — person record from the content API, loaded
   *                               by the user-store plugin after sign-in.
   *  - user.primaryEmailAddress — Clerk's verified email, used as fallback
   *                               if the contact record has no email yet.
   *
   * Unauthenticated users are shown an access-denied error with a login link
   * that redirects back to this page after sign-in.
   */
  const { isLoaded, isSignedIn, user, error: passwordError, loading: passwordLoading, changePassword } = useClerkAuth()
  const userStore = useUserStore()
  const contact = computed(() => userStore.personContact)

  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const passwordChanged = ref(false)

  async function handleChangePassword() {
    const ok = await changePassword(currentPassword.value, newPassword.value, confirmPassword.value)
    if (ok) {
      passwordChanged.value = true
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    }
  }
</script>

<style scoped>
  .page {
    min-height: 100vh;
  }

  .content {
    max-width: 640px;
    margin: 5rem auto;
    padding: 0 2rem;
  }

  .content h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 2rem;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    padding: 4rem 0;
  }

  .spinner {
    display: block;
    width: 2rem;
    height: 2rem;
    border: 3px solid #e5e7eb;
    border-top-color: #111827;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state {
    text-align: center;
  }

  .error-state h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
    color: #dc2626;
  }

  .error-state p {
    color: #6b7280;
    margin: 0 0 2rem;
  }

  .profile-card {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  .profile-row {
    display: flex;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #f3f4f6;
    gap: 1rem;
  }

  .profile-row:last-child {
    border-bottom: none;
  }

  .profile-label {
    width: 120px;
    flex-shrink: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }

  .profile-value {
    font-size: 0.95rem;
    color: #111827;
  }

  .content h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 2.5rem 0 1rem;
  }

  .field-row {
    flex-direction: column;
    gap: 0.4rem;
  }

  .field-row label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    width: auto;
  }

  .field-row input {
    padding: 0.6rem 0.85rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .field-row input:focus {
    border-color: #111827;
  }

  .form-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    border-bottom: none;
  }

  .error {
    color: #dc2626;
    font-size: 0.875rem;
    margin: 0;
  }

  .success {
    color: #16a34a;
    font-size: 0.9rem;
    margin: 0;
  }

  .btn-submit {
    background: #111827;
    color: #fff;
    border: none;
    padding: 0.6rem 1.25rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
