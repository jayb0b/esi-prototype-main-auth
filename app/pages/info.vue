<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <h1>Info</h1>
      <p>Placeholder content for the info page.</p>

      <!-- Authenticated: show user context -->
      <div v-if="isSignedIn" class="signed-in-note">
        You are viewing this as <strong>{{ user?.primaryEmailAddress?.emailAddress }}</strong>.
      </div>
      <!-- Unauthenticated: prompt to log in, redirecting back here after sign-in -->
      <div v-else class="sign-in-prompt">
        <NuxtLink :to="loginUrl" class="btn-primary">Log in to see more</NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * Info page (/info).
 *
 * A content page that is aware of authentication state but does not require it.
 * Authenticated users see their identity confirmed; unauthenticated users are
 * offered a login prompt that redirects back here after sign-in.
 *
 * loginUrl is defined here (rather than relying solely on AppHeader) because it
 * is also used in the page body for the "Log in to see more" button.
 */
const { isSignedIn, user } = useClerkAuth()

const requestUrl = useRequestURL()

/** Full URL of this page, used as the post-login redirect destination. */
const loginUrl = computed(
  () => `/login?redirect=${encodeURIComponent(requestUrl.href)}`
)
</script>

<style scoped>
.page {
  min-height: 100vh;
}

.content {
  max-width: 720px;
  margin: 5rem auto;
  padding: 0 2rem;
}

.content h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 1rem;
}

.content p {
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0 0 2rem;
}

.signed-in-note {
  padding: 1rem 1.25rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #166534;
}

.sign-in-prompt {
  margin-top: 1rem;
}
</style>
