export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export class UserService {
  private users: Map<string, User> = new Map()

  async createUser(email: string, name: string): Promise<User> {
    const user: User = {
      id: this.generateId(),
      email,
      name,
      createdAt: new Date()
    }

    this.users.set(user.id, user)
    return user
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id)
    if (!user) {
      return null
    }

    const updatedUser = { ...user, ...updates }
    this.users.set(id, updatedUser)
    return updatedUser
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id)
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values())
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15)
  }
}
