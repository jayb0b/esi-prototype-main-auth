/**
 * POST /api/clear-migrated
 *
 * Called after a migrated user successfully sets their new password.
 * Removes the `migrated` flag from publicMetadata so they are treated as a
 * fully registered user on subsequent sign-ins.
 *
 * Requires an active session — the client must call setActive() before this.
 */
import { clerkClient } from '@clerk/nuxt/server'

export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorised' })
  }

  await clerkClient(event).users.updateUserMetadata(userId, {
    publicMetadata: {
      migrated: false,
    },
  })

  return { ok: true }
})
