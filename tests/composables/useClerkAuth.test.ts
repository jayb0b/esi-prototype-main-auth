import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockSignIn = {
  create: vi.fn(),
  attemptFirstFactor: vi.fn(),
}
const mockSetActiveSignIn = vi.fn()

const mockSignUp = {
  create: vi.fn(),
  prepareEmailAddressVerification: vi.fn(),
  attemptEmailAddressVerification: vi.fn(),
  update: vi.fn(),
}
const mockSetActiveSignUp = vi.fn()

const mockClerk = {
  signOut: vi.fn(),
  user: { reload: vi.fn() },
}

const mockUserStore = {
  hydrate: vi.fn(),
  reset: vi.fn(),
}

const mockNavigateTo = vi.fn()
const mockFetch = vi.fn()

// Nuxt auto-imports stubbed as globals
vi.stubGlobal('useSignIn', () => ({
  signIn: ref(mockSignIn),
  setActive: ref(mockSetActiveSignIn),
}))
vi.stubGlobal('useSignUp', () => ({
  signUp: ref(mockSignUp),
  setActive: ref(mockSetActiveSignUp),
}))
vi.stubGlobal('useUser', () => ({
  isLoaded: ref(true),
  isSignedIn: ref(false),
  user: ref(null),
}))
vi.stubGlobal('useClerk', () => ref(mockClerk))
vi.stubGlobal('useUserStore', () => mockUserStore)
vi.stubGlobal('navigateTo', mockNavigateTo)
vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('ref', ref)

// sessionStorage is not available in node — provide a simple stub
const sessionStorageStore: Record<string, string> = {}
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => sessionStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { sessionStorageStore[key] = value },
  removeItem: (key: string) => { delete sessionStorageStore[key] },
  clear: () => { Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k]) },
})

// Import after globals are stubbed
const { useClerkAuth } = await import('../../app/composables/useClerkAuth')

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useClerkAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  // ── identifyEmail ──────────────────────────────────────────────────────

  describe('identifyEmail', () => {
    it('returns true for a known non-migrated email', async () => {
      mockFetch.mockResolvedValue({ exists: true, migrated: false })
      const { identifyEmail, error, loading } = useClerkAuth()

      const result = await identifyEmail('user@example.com')

      expect(result).toBe(true)
      expect(error.value).toBe('')
      expect(loading.value).toBe(false)
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })

    it('returns "register" for an unknown email without navigating', async () => {
      mockFetch.mockResolvedValue({ exists: false })
      const { identifyEmail } = useClerkAuth()

      const result = await identifyEmail('new@example.com')

      expect(result).toBe('register')
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })

    it('redirects to /password-reset-required and stores email for migrated user', async () => {
      mockFetch.mockResolvedValue({ exists: true, migrated: true })
      const { identifyEmail } = useClerkAuth()

      const result = await identifyEmail('migrated@example.com')

      expect(result).toBe(false)
      expect(sessionStorage.getItem('migrationEmail')).toBe('migrated@example.com')
      expect(mockNavigateTo).toHaveBeenCalledWith('/password-reset-required')
    })

    it('sets error and returns false on API failure', async () => {
      mockFetch.mockRejectedValue({ errors: [{ message: 'Server error' }] })
      const { identifyEmail, error } = useClerkAuth()

      const result = await identifyEmail('user@example.com')

      expect(result).toBe(false)
      expect(error.value).toBe('Server error')
    })
  })

  // ── login ──────────────────────────────────────────────────────────────

  describe('login', () => {
    it('signs in and redirects on success', async () => {
      mockSignIn.create.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_1' })
      mockSetActiveSignIn.mockResolvedValue(undefined)

      const { login } = useClerkAuth()
      await login('user@example.com', 'password123', '/dashboard')

      expect(mockSignIn.create).toHaveBeenCalledWith({ identifier: 'user@example.com', password: 'password123' })
      expect(mockSetActiveSignIn).toHaveBeenCalledWith({ session: 'sess_1' })
      expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard', { external: false })
    })

    it('uses external navigation for absolute redirect URLs', async () => {
      mockSignIn.create.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_1' })
      mockSetActiveSignIn.mockResolvedValue(undefined)

      const { login } = useClerkAuth()
      await login('user@example.com', 'password123', 'https://other.example.com/dashboard')

      expect(mockNavigateTo).toHaveBeenCalledWith('https://other.example.com/dashboard', { external: true })
    })

    it('sets error when sign-in status is not complete', async () => {
      mockSignIn.create.mockResolvedValue({ status: 'unknown_status' })

      const { login, error } = useClerkAuth()
      await login('user@example.com', 'password123')

      expect(error.value).toBe('Sign-in incomplete (status: unknown_status)')
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })

    it('sets error on Clerk API exception', async () => {
      mockSignIn.create.mockRejectedValue({ errors: [{ message: 'Invalid credentials' }] })

      const { login, error } = useClerkAuth()
      await login('user@example.com', 'wrongpassword')

      expect(error.value).toBe('Invalid credentials')
    })
  })

  // ── startSignUp ────────────────────────────────────────────────────────

  describe('startSignUp', () => {
    it('creates sign-up and sends email OTP', async () => {
      mockSignUp.create.mockResolvedValue({})
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      const { startSignUp } = useClerkAuth()
      const result = await startSignUp('new@example.com')

      expect(result).toBe(true)
      expect(mockSignUp.create).toHaveBeenCalledWith({ emailAddress: 'new@example.com' })
      expect(mockSignUp.prepareEmailAddressVerification).toHaveBeenCalledWith({ strategy: 'email_code' })
    })

    it('sets error and returns false on failure', async () => {
      mockSignUp.create.mockRejectedValue({ errors: [{ message: 'Email taken' }] })

      const { startSignUp, error } = useClerkAuth()
      const result = await startSignUp('taken@example.com')

      expect(result).toBe(false)
      expect(error.value).toBe('Email taken')
    })
  })

  // ── verifyEmail ────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it("returns 'password' when sign-up still needs a password", async () => {
      mockSignUp.attemptEmailAddressVerification.mockResolvedValue({ status: 'missing_requirements' })

      const { verifyEmail } = useClerkAuth()
      const result = await verifyEmail('123456')

      expect(result).toBe('password')
    })

    it("returns 'complete' and navigates home when sign-up finishes", async () => {
      mockSignUp.attemptEmailAddressVerification.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_2' })
      mockSetActiveSignUp.mockResolvedValue(undefined)

      const { verifyEmail } = useClerkAuth()
      const result = await verifyEmail('123456')

      expect(result).toBe('complete')
      expect(mockSetActiveSignUp).toHaveBeenCalledWith({ session: 'sess_2' })
      expect(mockNavigateTo).toHaveBeenCalledWith('/')
    })

    it('returns null and sets error on bad code', async () => {
      mockSignUp.attemptEmailAddressVerification.mockRejectedValue({ errors: [{ message: 'Incorrect code' }] })

      const { verifyEmail, error } = useClerkAuth()
      const result = await verifyEmail('000000')

      expect(result).toBeNull()
      expect(error.value).toBe('Incorrect code')
    })
  })

  // ── completeSignUp ─────────────────────────────────────────────────────

  const registrationData = {
    existingPersonId: null, town: 'London', country: 'GB',
  }

  describe('completeSignUp', () => {
    it('sets error immediately when passwords do not match', async () => {
      const { completeSignUp, error } = useClerkAuth()
      const result = await completeSignUp('pass1', 'pass2', { ...registrationData })

      expect(result).toBe(false)
      expect(error.value).toBe('Passwords do not match.')
      expect(mockSignUp.update).not.toHaveBeenCalled()
    })

    it('sets password and navigates home on success', async () => {
      mockSignUp.update.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_3' })
      mockSetActiveSignUp.mockResolvedValue(undefined)
      mockFetch.mockResolvedValue({})
      mockClerk.user.reload.mockResolvedValue(undefined)

      const { completeSignUp } = useClerkAuth()
      const result = await completeSignUp('password123', 'password123', { ...registrationData })

      expect(result).toBe(true)
      expect(mockSignUp.update).toHaveBeenCalledWith({ password: 'password123' })
      expect(mockNavigateTo).toHaveBeenCalledWith('/', { external: false })
    })
  })

  // ── email normalisation ────────────────────────────────────────────────

  describe('email normalisation', () => {
    it('identifyEmail lowercases and trims before calling the API', async () => {
      mockFetch.mockResolvedValue({ exists: true, migrated: false })
      const { identifyEmail } = useClerkAuth()

      await identifyEmail('  USER@EXAMPLE.COM  ')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/check-email',
        expect.objectContaining({ body: { email: 'user@example.com' } }),
      )
    })

    it('login lowercases and trims the identifier sent to Clerk', async () => {
      mockSignIn.create.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_1' })
      mockSetActiveSignIn.mockResolvedValue(undefined)
      const { login } = useClerkAuth()

      await login('  USER@EXAMPLE.COM  ', 'password123')

      expect(mockSignIn.create).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'user@example.com' }),
      )
    })

    it('startSignUp lowercases and trims the email address sent to Clerk', async () => {
      mockSignUp.create.mockResolvedValue({})
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})
      const { startSignUp } = useClerkAuth()

      await startSignUp('  NEW@EXAMPLE.COM  ')

      expect(mockSignUp.create).toHaveBeenCalledWith({ emailAddress: 'new@example.com' })
    })

    it('startPasswordReset lowercases and trims the identifier sent to Clerk', async () => {
      mockSignIn.create.mockResolvedValue({})
      const { startPasswordReset } = useClerkAuth()

      await startPasswordReset('  USER@EXAMPLE.COM  ')

      expect(mockSignIn.create).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'user@example.com' }),
      )
    })

  })

  // ── completePasswordReset ──────────────────────────────────────────────

  describe('completePasswordReset', () => {
    it('sets error immediately when passwords do not match', async () => {
      const { completePasswordReset, error } = useClerkAuth()
      const result = await completePasswordReset('pass1', 'pass2')

      expect(result).toBe(false)
      expect(error.value).toBe('Passwords do not match.')
    })

    it('resets password, activates session, and clears migrated flag on success', async () => {
      mockSignIn.resetPassword = vi.fn().mockResolvedValue({ status: 'complete', createdSessionId: 'sess_4' })
      mockSetActiveSignIn.mockResolvedValue(undefined)
      mockFetch.mockResolvedValue({})

      const { completePasswordReset } = useClerkAuth()
      const result = await completePasswordReset('newpass', 'newpass')

      expect(result).toBe(true)
      expect(mockSetActiveSignIn).toHaveBeenCalledWith({ session: 'sess_4' })
      expect(mockFetch).toHaveBeenCalledWith('/api/clear-migrated', { method: 'POST' })
    })
  })
})
