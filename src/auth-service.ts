// Authentication and session management
// This module handles user authentication, token generation, and session lifecycle

import * as crypto from 'crypto'

interface User {
  id: string
  username: string
  role: 'admin' | 'user' | 'guest'
  passwordHash?: string
  permissions: string[]
}

interface Session {
  userId: string
  token: string
  createdAt: number
  expiresAt: number
  lastActivity: number
}

// Simulated user database
const users: Map<string, User> = new Map()
const sessions: Map<string, Session> = new Map()
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export class AuthService {
  // Create a new user account
  async createUser(username: string, password: string, role: User['role'] = 'user'): Promise<User> {
    const existing = Array.from(users.values()).find(u => u.username === username)
    if (existing) {
      throw new Error('Username already exists')
    }

    const user: User = {
      id: this.generateId(),
      username,
      role,
      passwordHash: await this.hashPassword(password),
      permissions: this.getDefaultPermissions(role)
    }

    users.set(user.id, user)
    return user
  }

  // Authenticate user and create session
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const user = Array.from(users.values()).find(u => u.username === username)
    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials')
    }

    const valid = await this.verifyPassword(password, user.passwordHash)
    if (!valid) {
      throw new Error('Invalid credentials')
    }

    const token = this.generateSecureToken()
    const session: Session = {
      userId: user.id,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION,
      lastActivity: Date.now()
    }

    sessions.set(token, session)
    return { user, token }
  }

  // Validate session token
  async validateSession(token: string): Promise<User | null> {
    const session = sessions.get(token)
    if (!session) return null

    // Check expiration
    if (Date.now() > session.expiresAt) {
      sessions.delete(token)
      return null
    }

    // Update last activity
    session.lastActivity = Date.now()

    const user = users.get(session.userId)
    return user || null
  }

  // Check if user has specific permission
  async hasPermission(token: string, permission: string): Promise<boolean> {
    const user = await this.validateSession(token)
    if (!user) return false
    return user.permissions.includes(permission)
  }

  // Refresh session expiration
  async refreshSession(token: string): Promise<boolean> {
    const session = sessions.get(token)
    if (!session) return false

    if (Date.now() > session.expiresAt) {
      sessions.delete(token)
      return false
    }

    session.expiresAt = Date.now() + SESSION_DURATION
    session.lastActivity = Date.now()
    return true
  }

  // Revoke a session
  async logout(token: string): Promise<void> {
    sessions.delete(token)
  }

  // Role-based access check
  async requireRole(token: string, requiredRole: User['role']): Promise<User> {
    const user = await this.validateSession(token)
    if (!user) {
      throw new Error('Authentication required')
    }

    const roleHierarchy = { guest: 0, user: 1, admin: 2 }
    if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
      throw new Error('Insufficient permissions')
    }

    return user
  }

  // Generate secure random ID
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  // Generate session token
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // Hash password with PBKDF2
  private async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex')
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err)
        resolve(`${salt}:${derivedKey.toString('hex')}`)
      })
    })
  }

  // Verify password hash
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':')
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err)
        resolve(key === derivedKey.toString('hex'))
      })
    })
  }

  // Get default permissions based on role
  private getDefaultPermissions(role: User['role']): string[] {
    switch (role) {
      case 'admin': return ['read', 'write', 'delete', 'admin']
      case 'user': return ['read', 'write']
      case 'guest': return ['read']
    }
  }
}

export const authService = new AuthService()
