import { clerkClient } from '@clerk/nuxt/server'
import type { Pageable } from '~/app/types/pageable'

/**
 * GET /api/people
 *
 * Lists person contact records from the content API with pagination and
 * optional filtering. Roles for each person are fetched from Clerk in a
 * single batch call and merged into the response.
 *
 * Query parameters (all optional):
 *  page        — zero-indexed page number (default: 0)
 *  rows        — records per page (default: 20)
 *  firstName   — case-insensitive substring match
 *  lastName    — case-insensitive substring match
 *  email       — case-insensitive substring match
 *  companyName — case-insensitive substring match
 */

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
}

export interface PersonRow extends PersonContact {
  roles: string[]
  lastSignInAt: number | null
}

export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorised' })
  }

  const query = getQuery(event)
  const contentApi = useContentApi(event)

  const page = await contentApi<Pageable<PersonContact>>('/person/', {
    query: {
      page:        query.page        ?? 0,
      rows:        query.rows        ?? 20,
      firstName:   query.firstName   ?? undefined,
      lastName:    query.lastName    ?? undefined,
      email:       query.email       ?? undefined,
      companyName: query.companyName ?? undefined,
    },
  })

  // Collect email addresses on this page, then fetch all matching Clerk users
  // in a single batch call to avoid N individual requests. Email is used as
  // the join key because not all person records will have a clerkId.
  const emails = page.content.map(p => p.email).filter((e): e is string => !!e)

  interface ClerkData { roles: string[]; lastSignInAt: number | null }
  const clerkMap = new Map<string, ClerkData>()

  if (emails.length) {
    const { data: clerkUsers } = await clerkClient(event).users.getUserList({ emailAddress: emails })
    for (const clerkUser of clerkUsers) {
      const data: ClerkData = {
        roles:        (clerkUser.publicMetadata?.roles as string[] | undefined) ?? [],
        lastSignInAt: clerkUser.lastSignInAt ?? null,
      }
      for (const addr of clerkUser.emailAddresses) {
        clerkMap.set(addr.emailAddress, data)
      }
    }
  }

  const enriched: Pageable<PersonRow> = {
    ...page,
    content: page.content.map(person => ({
      ...person,
      roles:        person.email ? (clerkMap.get(person.email)?.roles        ?? [])   : [],
      lastSignInAt: person.email ? (clerkMap.get(person.email)?.lastSignInAt ?? null) : null,
    })),
  }

  return enriched
})
