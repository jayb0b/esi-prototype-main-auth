<template>
  <header class="header">
    <div class="header-inner">
      <NuxtLink to="/" class="logo">ESI.info</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/info" class="nav-link">Info</NuxtLink>
        <ClientOnly>
          <template v-if="isSignedIn">
            <NuxtLink to="/profile" class="nav-link">Profile</NuxtLink>
            <span class="user-email">{{ user?.primaryEmailAddress?.emailAddress }}</span>
            <button class="btn-secondary" @click="handleSignOut">Sign out</button>
          </template>
          <template v-else>
            <NuxtLink :to="loginUrl" class="nav-link">Log in</NuxtLink>
            <NuxtLink to="/register" class="btn-primary">Get started</NuxtLink>
          </template>
          <template #fallback>
            <NuxtLink to="/login" class="nav-link">Log in</NuxtLink>
            <NuxtLink to="/register" class="btn-primary">Get started</NuxtLink>
          </template>
        </ClientOnly>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
  /**
   * AppHeader — site-wide navigation header.
   *
   * Auth-aware: shows identity + sign-out when signed in, login + register when not.
   *
   * The login link always includes the current page as the `redirect` parameter so
   * the user is returned here after signing in, including across satellite domains.
   * useRequestURL() is used rather than useRoute() because it provides the full
   * absolute URL, which is required for cross-domain redirects.
   */
  const { isSignedIn, user, signOut } = useClerkAuth()
  const requestUrl = useRequestURL()

  const loginUrl = computed(() => `/login?redirect=${encodeURIComponent(requestUrl.href)}`)

  async function handleSignOut() {
    await signOut()
  }
</script>

<style scoped>
  .header {
    border-bottom: 1px solid #e5e7eb;
    padding: 0 2rem;
    font-family: system-ui, sans-serif;
  }

  .header-inner {
    max-width: 1100px;
    margin: 0 auto;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    font-size: 1.25rem;
    font-weight: 700;
    text-decoration: none;
    color: inherit;
  }

  .nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    text-decoration: none;
    color: #374151;
    font-size: 0.95rem;
  }

  .user-email {
    font-size: 0.9rem;
    color: #6b7280;
  }
</style>
