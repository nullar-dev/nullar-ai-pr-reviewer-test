// Authentication and session management
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
}

const users: Map<string, User> = new Map()
const sessions: Map<string, Session> = new Map()

export class AuthService {
  async createUser(username: string, password: string, role: User['role'] = 'user'): Promise<User> {
    const user: User = {
      id: crypto.randomBytes(16).toString('hex'),
      username,
      role,
      passwordHash: await this.hashPassword(password),
      permissions: role === 'admin' ? ['read', 'write', 'delete'] : ['read', 'write']
    }
    users.set(user.id, user)
    return user
  }

  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const user = Array.from(users.values()).find(u => u.username === username)
    if (!user) throw new Error('Invalid credentials')

    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, { userId: user.id, token, createdAt: Date.now(), expiresAt: Date.now() + 86400000 })
    return { user, token }
  }

  async validateSession(token: string): Promise<User | null> {
    const session = sessions.get(token)
    if (!session || Date.now() > session.expiresAt) return null
    return users.get(session.userId) || null
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex')
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
        if (err) reject(err)
        resolve(`${salt}:${key.toString('hex')}`)
      })
    })
  }
}
