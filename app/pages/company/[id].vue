<template>
  <ClientOnly>
    <template #fallback>
      <div class="spinner-wrap"><span class="spinner" /></div>
    </template>

    <div v-if="!isLoaded" class="spinner-wrap"><span class="spinner" /></div>

    <div v-else-if="isAllowed">Access allowed</div>

    <!-- isLoaded but not allowed: blank while middleware redirects -->
  </ClientOnly>
</template>

<script lang="ts" setup>
  definePageMeta({ middleware: 'company' })

  const route = useRoute()
  const { isLoaded, isSignedIn, user } = useClerkAuth()

  const isAllowed = computed(() => {
    if (!isSignedIn.value) return false
    const id = route.params.id as string
    const roles = (user.value?.publicMetadata?.roles as string[] | undefined) ?? []
    return roles.includes('ROLE_STAFF') || roles.includes(`ROLE_EDITOR_${id}`)
  })
</script>

<style scoped>
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
    to { transform: rotate(360deg); }
  }
</style>
