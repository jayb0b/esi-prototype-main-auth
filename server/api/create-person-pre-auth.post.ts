/**
 * POST /api/create-person-pre-auth
 *
 * Creates a person record in the content API immediately after email
 * verification, before the user has a Clerk session (i.e. before they set
 * their password). This ensures the person is captured even if they abandon
 * the registration after verifying their email.
 *
 * Security: the content API requires the X-Server-Secret header, which is
 * applied server-side by useContentApiServer and never exposed to the browser.
 * An unlinked person record (no clerkId) grants no authentication access.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = String(body.email ?? '').trim().toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email is required' })
  }

  function trimmed(val: unknown): string | undefined {
    const s = String(val ?? '').trim()
    return s || undefined
  }

  const contentApi = useContentApiServer(event)

  const result = await contentApi('/person/', {
    method: 'POST',
    body: {
      email,
      firstName:   trimmed(body.firstName),
      lastName:    trimmed(body.lastName),
      jobTitle:    trimmed(body.jobTitle),
      companyName: trimmed(body.companyName),
      town:        trimmed(body.town),
      country:     trimmed(body.country),
    },
  }) as { id?: number }

  return { personId: result.id ?? null }
})
