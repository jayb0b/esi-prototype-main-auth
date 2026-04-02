<template>
  <div class="page">
    <AppHeader />

    <main class="content">
    <div class="page-header">
      <h1>People</h1>
      <p class="total" v-if="data">{{ data.totalElements.toLocaleString() }} records</p>
    </div>

    <!-- Filters -->
    <form class="filters" @submit.prevent="applyFilters">
      <input v-model="draft.firstName"   placeholder="First name"   class="filter-input" />
      <input v-model="draft.lastName"    placeholder="Last name"    class="filter-input" />
      <input v-model="draft.email"       placeholder="Email"        class="filter-input" />
      <input v-model="draft.companyName" placeholder="Company"      class="filter-input" />
      <button type="submit" class="btn-apply">Search</button>
      <button v-if="hasFilters" type="button" class="btn-clear" @click="clearFilters">Clear</button>
    </form>

    <!-- Table -->
    <div class="table-wrap">
      <div v-if="status === 'pending'" class="spinner-wrap"><span class="spinner" /></div>
      <div v-else-if="error" class="error-msg">Failed to load people.</div>
      <template v-else-if="data">
        <table v-if="data.content.length" class="people-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Job title</th>
              <th>Company</th>
              <th>Town</th>
              <th>Country</th>
              <th>Roles</th>
              <th>Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="person in data.content" :key="person.id">
              <td>{{ fullName(person) }}</td>
              <td>{{ person.email || '—' }}</td>
              <td>{{ person.jobTitle || '—' }}</td>
              <td>{{ person.companyName || '—' }}</td>
              <td>{{ person.town || '—' }}</td>
              <td>{{ person.country || '—' }}</td>
              <td>{{ person.roles.length ? person.roles.join(', ') : '—' }}</td>
              <td>{{ person.lastSignInAt ? new Date(person.lastSignInAt).toLocaleDateString() : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">No records match your search.</p>
      </template>
    </div>

    <!-- Pagination -->
    <div v-if="data && data.totalPages > 1" class="pagination">
      <button :disabled="page === 0" class="page-btn" @click="page--">← Prev</button>
      <span class="page-info">Page {{ page + 1 }} of {{ data.totalPages }}</span>
      <button :disabled="page >= data.totalPages - 1" class="page-btn" @click="page++">Next →</button>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
  /**
   * People page (/people).
   *
   * Lists all person contact records from the content API. Restricted to
   * ROLE_STAFF via the admin layout and middleware. Supports server-side
   * pagination and filtering by name, email, and company.
   */
  definePageMeta({})

  interface PersonContact {
    id: number
    email: string | null
    firstName: string | null
    lastName: string | null
    jobTitle: string | null
    companyName: string | null
    town: string | null
    country: string | null
    clerkId: string | null
    roles: string[]
    lastSignInAt: number | null
  }

  const page = ref(0)

  const filters = ref({ firstName: '', lastName: '', email: '', companyName: '' })
  const draft   = ref({ ...filters.value })

  const hasFilters = computed(() =>
    Object.values(filters.value).some(v => v.trim() !== '')
  )

  // Reset to page 0 whenever filters change
  watch(filters, () => { page.value = 0 }, { deep: true })

  const { data, status, error } = useFetch<Pageable<PersonContact>>('/api/people', {
    query: computed(() => ({
      page:        page.value,
      rows:        20,
      firstName:   filters.value.firstName   || undefined,
      lastName:    filters.value.lastName    || undefined,
      email:       filters.value.email       || undefined,
      companyName: filters.value.companyName || undefined,
    })),
  })

  function applyFilters() {
    filters.value = { ...draft.value }
  }

  function clearFilters() {
    draft.value   = { firstName: '', lastName: '', email: '', companyName: '' }
    filters.value = { ...draft.value }
  }

  function fullName(person: PersonContact): string {
    return [person.firstName, person.lastName].filter(Boolean).join(' ') || '—'
  }
</script>

<style scoped>
  .page-header {
    display: flex;
    align-items: baseline;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
  }

  .total {
    font-size: 0.9rem;
    color: #6b7280;
    margin: 0;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-bottom: 1.5rem;
  }

  .filter-input {
    padding: 0.45rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    width: 160px;
    outline: none;
  }

  .filter-input:focus {
    border-color: #111827;
  }

  .btn-apply, .btn-clear {
    padding: 0.45rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
  }

  .btn-apply {
    background: #111827;
    color: #fff;
  }

  .btn-clear {
    background: #f3f4f6;
    color: #374151;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .people-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .people-table th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-bottom: 2px solid #e5e7eb;
    font-size: 0.8rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .people-table td {
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid #f3f4f6;
    color: #111827;
    white-space: nowrap;
  }

  .people-table tr:last-child td {
    border-bottom: none;
  }

  .people-table tr:hover td {
    background: #f9fafb;
  }

  .spinner-wrap {
    display: flex;
    justify-content: center;
    padding: 4rem 0;
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

  .error-msg, .empty {
    color: #6b7280;
    text-align: center;
    padding: 3rem 0;
  }

  .error-msg {
    color: #dc2626;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .page-btn {
    padding: 0.4rem 0.85rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .page {
    min-height: 100vh;
  }

  .content {
    max-width: 1100px;
    margin: 4rem auto;
    padding: 0 2rem;
  }
</style>
