<template>
  <div class="page">
    <AppHeader />

    <main class="hero">
      <ClientOnly>
        <!-- Authenticated state: personalised welcome -->
        <template v-if="isSignedIn">
          <h1>Welcome to ESI.info</h1>
          <p>
            You're signed in as <strong>{{ user?.primaryEmailAddress?.emailAddress }}</strong
            >.
          </p>
        </template>
        <!-- Unauthenticated state: marketing hero -->
        <template v-else>
          <h1>Welcome to ESI.info</h1>
          <p>Placeholder text describing what this product does and why it matters.</p>
          <div class="hero-actions">
            <NuxtLink to="/register" class="btn-primary">Get started</NuxtLink>
            <NuxtLink to="/login" class="btn-secondary">Log in</NuxtLink>
          </div>
        </template>
        <!-- SSR fallback: always render the marketing hero server-side -->
        <template #fallback>
          <h1>Welcome to ESI.info</h1>
          <p>Placeholder text describing what this product does and why it matters.</p>
          <div class="hero-actions">
            <NuxtLink to="/register" class="btn-primary">Get started</NuxtLink>
            <NuxtLink to="/login" class="btn-secondary">Log in</NuxtLink>
          </div>
        </template>
      </ClientOnly>
    </main>
  </div>
</template>

<script setup lang="ts">
  /**
   * Home page (/).
   *
   * Renders different content depending on authentication state:
   *  - Signed out: marketing hero with links to /register and /login.
   *  - Signed in:  personalised welcome showing the user's email.
   */
  const { isSignedIn, user } = useClerkAuth()
</script>

<style scoped>
  .page {
    min-height: 50vh;
  }

  .hero {
    max-width: 640px;
    margin: 8rem auto;
    text-align: center;
    padding: 0 2rem;
  }

  .hero h1 {
    font-size: 3rem;
    font-weight: 700;
    margin: 0 0 1rem;
    line-height: 1.15;
  }

  .hero p {
    font-size: 1.2rem;
    color: #6b7280;
    margin: 0 0 2.5rem;
  }

  .hero-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }
</style>
