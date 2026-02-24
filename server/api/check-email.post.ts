/**
 * POST /api/check-email
 *
 * Looks up an email address against Clerk user records and returns enough
 * information for the login page to decide the next step — without requiring
 * an active session.
 *
 * Responses:
 *  { exists: false }                   — no Clerk user with this email
 *  { exists: true, migrated: false }   — normal user, show password field
 *  { exists: true, migrated: true }    — migrated user, redirect to reset flow
 */
import { clerkClient } from '@clerk/nuxt/server'

export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email is required' })
  }

  const { data } = await clerkClient(event).users.getUserList({ emailAddress: [email] })

  if (data.length === 0) {
    return { exists: false }
  }

  const migrated = data[0]?.publicMetadata?.migrated === true
  return { exists: true, migrated }
})
