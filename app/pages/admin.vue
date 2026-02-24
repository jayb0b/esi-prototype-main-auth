<template>
  <div>
    <h1>Admin</h1>

    <div class="section">
      <h2>Signed-in user</h2>
      <div class="detail-card">
        <div class="detail-row">
          <span class="detail-label">Email</span>
          <span class="detail-value">{{ user?.primaryEmailAddress?.emailAddress }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Clerk ID</span>
          <span class="detail-value mono">{{ user?.id }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Roles</span>
          <span class="detail-value">
            <span v-for="role in roles" :key="role" class="badge">{{ role }}</span>
          </span>
        </div>
      </div>
    </div>
    {{ companies }}
  </div>
</template>

<script setup lang="ts">
  /**
   * Admin page (/admin).
   *
   * Uses the 'admin' layout, which keeps all content out of the SSR payload and
   * shows a spinner until Clerk confirms the user holds ROLE_STAFF. The route
   * middleware handles the same check for client-side navigations. By the time
   * this component renders, auth is guaranteed.
   */
  definePageMeta({ layout: 'admin', middleware: 'admin' })
  const { $contentApi } = useNuxtApp()
  const { user } = useClerkAuth()

  const roles = computed(() => (user.value?.publicMetadata?.roles as string[] | undefined) ?? [])

  const { data: companies } = useFetch(`http://localhost:8080/api/admin/company/`, {
    $fetch: $contentApi,
  })
</script>

<style scoped>
  h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 2rem;
  }

  .section {
    margin-bottom: 2.5rem;
  }

  .section h2 {
    font-size: 1rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.75rem;
  }

  .detail-card {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  .detail-row {
    display: flex;
    align-items: center;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #f3f4f6;
    gap: 1rem;
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    width: 100px;
    flex-shrink: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }

  .detail-value {
    font-size: 0.95rem;
    color: #111827;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .mono {
    font-family: monospace;
    font-size: 0.85rem;
  }

  .badge {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 0.15rem 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
  }
</style>
