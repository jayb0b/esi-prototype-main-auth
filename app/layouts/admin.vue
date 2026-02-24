<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <!--
        ClientOnly prevents any admin content from being server-rendered.
        The fallback spinner is what the browser receives in the initial HTML,
        so there is nothing sensitive to flash while the client boots.
      -->
      <ClientOnly>
        <template #fallback>
          <div class="spinner-wrap"><span class="spinner" /></div>
        </template>

        <!-- Still waiting for Clerk to load the user profile -->
        <div v-if="!isLoaded" class="spinner-wrap"><span class="spinner" /></div>

        <!-- Clerk is ready and user is confirmed admin — render the page -->
        <slot v-else-if="isAdmin" />

        <!-- isLoaded but not admin: blank while the watcher redirects -->
      </ClientOnly>
    </main>
  </div>
</template>

<script setup lang="ts">
  /**
   * Layout: admin
   *
   * Wraps all admin pages. Keeps protected content out of the SSR payload
   * entirely via <ClientOnly>, then gates the slot behind an isAdmin check
   * once Clerk has loaded. While auth state is being resolved, a spinner is
   * shown in place of the page content.
   *
   * The admin route middleware still runs for client-side navigations (entering
   * /admin from another page), providing an earlier redirect before the
   * component tree mounts at all. This layout is the safety net for direct URL
   * access where the middleware cannot act server-side.
   */
  const { isLoaded, isSignedIn, user } = useClerkAuth()

  const isAdmin = computed(() => {
    const roles = (user.value?.publicMetadata?.roles as string[] | undefined) ?? []
    return roles.includes('ROLE_STAFF')
  })

  watch(
    isLoaded,
    (loaded) => {
      if (!loaded) return
      if (!isSignedIn.value || !isAdmin.value) {
        navigateTo('/')
      }
    },
    { immediate: true }
  )
</script>

<style scoped>
  .page {
    min-height: 100vh;
  }

  .content {
    max-width: 720px;
    margin: 4rem auto;
    padding: 0 2rem;
  }

  .spinner-wrap {
    display: flex;
    justify-content: center;
    padding: 6rem 0;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #e5e7eb;
    border-top-color: #111827;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
