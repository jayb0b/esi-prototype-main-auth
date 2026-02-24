/**
 * POST /api/complete-signup
 *
 * Called client-side immediately after a new user sets their password and
 * their Clerk session has been activated via setActive(). At that point the
 * session cookie is present, so event.context.auth() resolves the userId.
 *
 * Responsibilities:
 *  - Guard against unauthenticated calls (no session = 401).
 *  - Use the Clerk Backend SDK (server-side, uses the secret key) to stamp
 *    publicMetadata onto the user record. publicMetadata is read-only from
 *    the client, so it can be trusted as authoritative for authorisation checks.
 *
 * publicMetadata set:
 *  - roles: string[]  — initial role assigned to every new registrant.
 *
 * Note: unsafeMetadata (set during sign-up to capture companyName) is
 * writable by the client and should not be used for authorisation decisions.
 */
import { clerkClient } from '@clerk/nuxt/server'

export default defineEventHandler(async (event) => {
  // Retrieve the authenticated user's ID from the Clerk session context.
  // event.context.auth() is populated by the @clerk/nuxt middleware.
  const { userId } = event.context.auth()

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorised' })
  }

  // clerkClient(event) returns a Clerk Backend SDK instance authenticated
  // with the NUXT_CLERK_SECRET_KEY environment variable.
  await clerkClient(event).users.updateUserMetadata(userId, {
    publicMetadata: {
      roles: ['ROLE_USER'],
    },
  })

  return { ok: true }
})
