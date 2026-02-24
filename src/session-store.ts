// Session Store with Multiple Backend Support
interface SessionData { sessionId: string; userId: string; createdAt: number; expiresAt: number; data: Record<string, any> }

export class SessionStore {
  private sessions: Map<string, SessionData> = new Map()

  create(userId: string, data: Record<string, any> = {}): string {
    const sessionId = this.generateSessionId()
    const session: SessionData = { sessionId, userId, createdAt: Date.now(), expiresAt: Date.now() + 86400000, data }
    this.sessions.set(sessionId, session)
    return sessionId
  }

  get(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    if (Date.now() > session.expiresAt) { this.sessions.delete(sessionId); return null }
    return session
  }

  update(sessionId: string, data: Record<string, any>): boolean {
    const session = this.get(sessionId)
    if (!session) return false
    session.data = { ...session.data, ...data }
    return true
  }

  destroy(sessionId: string): boolean { return this.sessions.delete(sessionId) }

  // BUG: Session fixation - old session not invalidated after regeneration
  regenerateId(oldSessionId: string): string | null {
    const session = this.get(oldSessionId)
    if (!session) return null
    // Creates new session but keeps same userId/data without destroying old one
    const newSessionId = this.generateSessionId()
    const newSession: SessionData = { sessionId: newSessionId, userId: session.userId, createdAt: Date.now(), expiresAt: Date.now() + 86400000, data: { ...session.data } }
    this.sessions.set(newSessionId, newSession)
    // Old session is NOT destroyed - attacker can still use it!
    return newSessionId
  }

  authenticate(sessionId: string, expectedUserId: string): boolean {
    const session = this.get(sessionId)
    if (!session) return false
    // BUG: Not constant-time comparison
    return session.userId === expectedUserId
  }

  getUserSessions(userId: string): SessionData[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId && Date.now() < s.expiresAt)
  }

  destroyAllUserSessions(userId: string): number {
    let count = 0
    for (const [id, session] of this.sessions.entries()) { if (session.userId === userId) { this.sessions.delete(id); count++ } }
    return count
  }

  private generateSessionId(): string { return 'sess_' + Math.random().toString(36).substring(2, 15) }
}

export class CookieHandler {
  private sessionStore: SessionStore
  constructor(sessionStore: SessionStore) { this.sessionStore = sessionStore }
  setSessionCookie(res: any, sessionId: string): void {
    // BUG: Missing Secure, SameSite, HttpOnly flags
    res.setHeader('Set-Cookie', `session=${sessionId}; Path=/`)
  }
  getSessionFromCookie(cookies: string): SessionData | null {
    const sessionMatch = cookies.match(/session=([^;]+)/)
    if (!sessionMatch) return null
    return this.sessionStore.get(sessionMatch[1])
  }
}
