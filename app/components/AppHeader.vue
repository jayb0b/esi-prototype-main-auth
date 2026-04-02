<template>
  <header class="header">
    <div class="header-inner">
      <NuxtLink to="/" class="logo">ESI.info</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/info" class="nav-link">Info</NuxtLink>
        <ClientOnly>
          <template v-if="isSignedIn">
            <div ref="avatarRef" class="avatar-wrap">
              <button class="avatar" :style="{ background: avatarBg }" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
                {{ initials }}
              </button>
              <div v-if="menuOpen" class="dropdown">
                <NuxtLink to="/profile" class="dropdown-item" @click="menuOpen = false">Profile</NuxtLink>
                <button class="dropdown-item" @click="handleSignOut">Sign out</button>
              </div>
            </div>
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
  const { isSignedIn, signOut, user } = useClerkAuth()
  const userStore = useUserStore()
  const requestUrl = useRequestURL()

  const loginUrl = computed(() => `/login?redirect=${encodeURIComponent(requestUrl.href)}`)

  const AVATAR_COLORS = [
    '#1e3a5f', '#3b1f5e', '#1f4d3b', '#5c1f1f', '#1f3d5c',
    '#4a2060', '#1a4a3a', '#5c3317', '#1e4d4d', '#3d1a4a',
    '#2d4a1e', '#5c2a1a',
  ]

  function avatarColor(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
  }

  const initials = computed(() => {
    const first = userStore.personContact?.firstName?.[0] ?? ''
    const last = userStore.personContact?.lastName?.[0] ?? ''
    const nameInitials = (first + last).toUpperCase()
    if (nameInitials) return nameInitials
    const email = userStore.personContact?.email
      ?? user.value?.primaryEmailAddress?.emailAddress
      ?? ''
    return email.slice(0, 2).toUpperCase() || '?'
  })

  const avatarBg = computed(() => avatarColor(initials.value))

  const menuOpen = ref(false)
  const avatarRef = ref<HTMLElement | null>(null)

  onMounted(() => {
    document.addEventListener('click', onClickOutside)
  })
  onUnmounted(() => {
    document.removeEventListener('click', onClickOutside)
  })

  function onClickOutside(e: MouseEvent) {
    if (avatarRef.value && !avatarRef.value.contains(e.target as Node)) {
      menuOpen.value = false
    }
  }

  async function handleSignOut() {
    menuOpen.value = false
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

  .avatar-wrap {
    position: relative;
  }

  .avatar {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    color: #fff;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 140px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    z-index: 100;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 0.65rem 1rem;
    font-size: 0.9rem;
    color: #111827;
    text-decoration: none;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }

  .dropdown-item:hover {
    background: #f9fafb;
  }
</style>
