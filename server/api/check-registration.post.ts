import { isCompanyEmail } from 'company-email-validator'

const UK_IRELAND_CODES = new Set(['GB', 'IE', 'IM', 'GG', 'JE'])

interface IpApiResponse {
  status: 'success' | 'fail'
  countryCode?: string
  country?: string
  city?: string
}

interface PersonApiResponse {
  content?: { id: number; town: string | null; companyName: string | null }[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email is required' })
  }

  // ── 1. IP geolocation ──────────────────────────────────────────────────────
  const forwarded = getHeader(event, 'x-forwarded-for')
  const ip = (forwarded ? forwarded.split(',')[0] ?? '' : (event.node.req.socket?.remoteAddress ?? '')).trim()

  let isUK = true // default to true for private/localhost IPs
  let geoTown: string | null = null
  let geoCountry: string | null = null
  if (
    ip &&
    ip !== '127.0.0.1' &&
    ip !== '::1' &&
    !ip.startsWith('192.168.') &&
    !ip.startsWith('10.')
  ) {
    try {
      const geo = await $fetch<IpApiResponse>(
        `http://ip-api.com/json/${ip}?fields=status,countryCode,country,city`
      )
      if (geo.status === 'success' && geo.countryCode) {
        isUK = UK_IRELAND_CODES.has(geo.countryCode)
        geoTown = geo.city ?? null
        geoCountry = geo.country ?? null
      }
      // status === 'fail' (private/reserved IP) → keep defaults
    } catch {
      // geolocation unreachable → keep defaults
    }
  }

  // ── 2. Corporate email check ───────────────────────────────────────────────
  const isCorporate = isCompanyEmail(email)

  // ── 3. Person table lookup ─────────────────────────────────────────────────
  let existingPersonId: number | null = null
  let personIsComplete = false
  try {
    const contentApi = useContentApiServer(event)
    const response = await contentApi<PersonApiResponse>('/person/', {
      query: { email },
    })
    const person = response.content?.[0] ?? null
    existingPersonId = person?.id ?? null
    personIsComplete = !!(person?.town && person?.companyName)
  } catch {
    // content API unreachable → treat as not found
  }

  const fastTrack = (existingPersonId !== null && personIsComplete) || (isUK && isCorporate)

  return { fastTrack, existingPersonId, town: geoTown, country: geoCountry }
})
