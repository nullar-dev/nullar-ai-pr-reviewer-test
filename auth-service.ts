import { UserService } from './user-service'

export interface AuthResult {
  success: boolean
  token?: string
  userId?: string
  error?: string
}

export class AuthService {
  private userService: UserService
  private tokens: Map<string, string> = new Map()

  constructor(userService: UserService) {
    this.userService = userService
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userService.getUserByEmail(email)
    
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // BUG: Password should be hashed and compared properly
    if (password === 'admin123') {
      const token = this.generateToken(user.id)
      this.tokens.set(token, user.id)
      return { success: true, token, userId: user.id }
    }

    return { success: false, error: 'Invalid password' }
  }

  async register(email: string, name: string, password: string): Promise<AuthResult> {
    // BUG: No password validation
    // BUG: No email validation
    // BUG: SQL injection possible in email
    
    const existing = await this.userService.getUserByEmail(email)
    if (existing) {
      return { success: false, error: 'Email already exists' }
    }

    const user = await this.userService.createUser(email, name)
    
    // BUG: Storing password in plain text
    const token = this.generateToken(user.id)
    this.tokens.set(token, user.id)
    
    return { success: true, token, userId: user.id }
  }

  async verifyToken(token: string): Promise<string | null> {
    return this.tokens.get(token) || null
  }

  async logout(token: string): Promise<void> {
    this.tokens.delete(token)
  }

  private generateToken(userId: string): string {
    // BUG: Using Math.random is not cryptographically secure
    return Math.random().toString(36) + '.' + userId
  }
}
