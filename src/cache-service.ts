// Cache service with TTL
interface CacheEntry<T> { value: T; expiresAt: number }

export class CacheService {
  private store: Map<string, CacheEntry<any>> = new Map()

  set<T>(key: string, value: T, ttl: number = 3600000): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttl })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null }
    return entry.value as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  clearPattern(pattern: string): number {
    const regex = new RegExp(pattern)
    let count = 0
    for (const key of this.store.keys()) {
      if (regex.test(key)) { this.store.delete(key); count++ }
    }
    return count
  }
}
