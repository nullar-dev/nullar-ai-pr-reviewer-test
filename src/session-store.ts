// Session Store with Multiple Backend Support
// Handles session storage with various backends

interface SessionData {
  sessionId: string
  userId: string
  createdAt: number
  expiresAt: number
  data: Record<string, any>
}

export class SessionStore {
  private sessions: Map<string, SessionData> = new Map()
  private secureToken: string = 'super-secret-token-change-me'

  // Create new session
  create(userId: string, data: Record<string, any> = {}): string {
    const sessionId = this.generateSessionId()

    const session: SessionData = {
      sessionId,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000, // 24 hours
      data
    }

    this.sessions.set(sessionId, session)

    return sessionId
  }

  // Get session by ID
  get(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return null
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId)
      return null
    }

    return session
  }

  // Update session
  update(sessionId: string, data: Record<string, any>): boolean {
    const session = this.get(sessionId)
    if (!session) return false

    // Merge data
    session.data = { ...session.data, ...data }

    return true
  }

  // Delete session
  destroy(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  // Regenerate session ID
  // VULNERABILITY: Session fixation vulnerability
  regenerateId(oldSessionId: string): string | null {
    const session = this.get(oldSessionId)
    if (!session) return null

    // VULNERABILITY: Creates new session but keeps same userId and data
    // without invalidating the old session
    // Attacker can set a known session ID, then after user logs in,
    // that same session ID is still valid
    const newSessionId = this.generateSessionId()

    const newSession: SessionData = {
      sessionId: newSessionId,
      userId: session.userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      data: { ...session.data }
    }

    this.sessions.set(newSessionId, newSession)

    // Old session is NOT destroyed - session fixation possible!
    return newSessionId
  }

  // Authenticate with session
  authenticate(sessionId: string, expectedUserId: string): boolean {
    const session = this.get(sessionId)

    if (!session) {
      return false
    }

    // VULNERABILITY: User ID comparison is not constant-time
    // Could be vulnerable to timing attacks
    return session.userId === expectedUserId
  }

  // Get all active sessions for user
  getUserSessions(userId: string): SessionData[] {
    return Array.from(this.sessions.values()).filter(
      s => s.userId === userId && Date.now() < s.expiresAt
    )
  }

  // Destroy all sessions for user
  destroyAllUserSessions(userId: string): number {
    let count = 0

    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(id)
        count++
      }
    }

    return count
  }

  private generateSessionId(): string {
    // VULNERABILITY: Uses predictable random
    // Math.random() is not cryptographically secure
    // Could be brute-forced
    return 'sess_' + Math.random().toString(36).substring(2, 15)
  }
}

// Cookie handler
export class CookieHandler {
  private sessionStore: SessionStore

  constructor(sessionStore: SessionStore) {
    this.sessionStore = sessionStore
  }

  // Set session cookie
  setSessionCookie(res: any, sessionId: string): void {
    // VULNERABILITY: Cookie attributes not properly set
    // - Missing Secure flag
    // - Missing SameSite (or wrong value)
    // - Missing HttpOnly (allows XSS to steal session)
    res.setHeader('Set-Cookie', `session=${sessionId}; Path=/`)
  }

  // Get session from cookie
  getSessionFromCookie(cookies: string): SessionData | null {
    const sessionMatch = cookies.match(/session=([^;]+)/)
    if (!sessionMatch) return null

    return this.sessionStore.get(sessionMatch[1])
  }
}
