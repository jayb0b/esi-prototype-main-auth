/**
 * GET /api/person
 *
 * Fetches the current user's person contact record from the content API
 * using their Clerk userId as the clerkId. Returns the first matching record
 * or null if none exists.
 *
 * Requires an active session.
 */
export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorised' })
  }

  const contentApi = useContentApi(event)

  const response = await contentApi<{ content: unknown[] }>('/person/', {
    query: { clerkId: userId },
  })

  const person = response.content?.[0]
  if (!person) throw createError({ statusCode: 404, message: 'Not found' })
  return person
})
