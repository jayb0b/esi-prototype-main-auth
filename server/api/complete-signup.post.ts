/**
 * POST /api/complete-signup
 *
 * Called client-side immediately after a new user sets their password and
 * their Clerk session has been activated via setActive(). At that point the
 * session cookie is present, so event.context.auth() resolves the userId.
 *
 * Responsibilities:
 *  - Guard against unauthenticated calls (no session = 401).
 *  - Guard against repeat calls — if roles are already stamped, this is a no-op.
 *  - Use the Clerk Backend SDK (server-side, uses the secret key) to stamp
 *    publicMetadata onto the user record. publicMetadata is read-only from
 *    the client, so it can be trusted as authoritative for authorisation checks.
 *  - Link the Clerk userId to the person record created during email verification
 *    (POST /api/person/ is now ROLE_SERVER only; person creation happens earlier
 *    in the flow via /api/create-person-pre-auth).
 *
 * publicMetadata set:
 *  - roles: string[]  — initial role assigned to every new registrant.
 */
import { clerkClient } from '@clerk/nuxt/server'

export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorised' })
  }

  const clerk = clerkClient(event)

  // Idempotency guard: if roles are already set, signup has already completed.
  const clerkUser = await clerk.users.getUser(userId)
  if ((clerkUser.publicMetadata?.roles as string[] | undefined)?.length) {
    return { ok: true }
  }

  const body = await readBody(event)
  const contentApi = useContentApi(event)

  const existingPersonId = body.existingPersonId != null ? Number(body.existingPersonId) : null

  if (!existingPersonId) {
    throw createError({ statusCode: 400, message: 'No person record found for this registration.' })
  }

  function trimmed(val: unknown): string | undefined {
    const s = String(val ?? '').trim()
    return s || undefined
  }

  await Promise.all([
    clerk.users.updateUserMetadata(userId, {
      publicMetadata: { roles: ['ROLE_USER'] },
    }),
    contentApi(`/person/${existingPersonId}/`, {
      method: 'PATCH',
      body: { clerkId: userId, town: trimmed(body.town), country: trimmed(body.country) },
    }),
  ])

  return { ok: true }
})
