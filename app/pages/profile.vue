<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <!-- Unauthenticated: show error -->
      <div v-if="!isSignedIn" class="error-state">
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
            <span class="profile-value">{{ user?.primaryEmailAddress?.emailAddress }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">First name</span>
            <span class="profile-value">{{ meta.firstName || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Last name</span>
            <span class="profile-value">{{ meta.lastName || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Job title</span>
            <span class="profile-value">{{ meta.jobTitle || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Company</span>
            <span class="profile-value">{{ meta.companyName || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Town</span>
            <span class="profile-value">{{ meta.town || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Country</span>
            <span class="profile-value">{{ meta.country || '—' }}</span>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
  /**
   * Profile page (/profile).
   *
   * Authenticated users see their profile details drawn from:
   *  - user.primaryEmailAddress — Clerk's verified email.
   *  - user.unsafeMetadata      — profile fields collected at registration
   *                               (firstName, lastName, jobTitle, companyName,
   *                               town, country). Client-writable; not used for
   *                               authorisation.
   *  - userStore.roles          — roles from publicMetadata, set server-side at
   *                               registration via /api/complete-signup.
   *
   * Unauthenticated users are shown an access-denied error with a login link
   * that redirects back to this page after sign-in.
   */
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const userStore = useUserStore()

  /**
   * Typed shorthand for the unsafeMetadata fields captured during registration.
   * Falls back to an empty object so template expressions are always safe.
   */
  const meta = computed(
    () =>
      (user.value?.unsafeMetadata ?? {}) as {
        firstName?: string
        lastName?: string
        jobTitle?: string
        companyName?: string
        town?: string
        country?: string
      }
  )
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
</style>
