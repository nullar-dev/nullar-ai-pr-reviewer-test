// Cache layer with support for TTL and invalidation
// Provides in-memory caching with expiration and pattern-based clearing

interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
}

interface CacheConfig {
  defaultTTL: number
  maxSize: number
  cleanupInterval: number
}

export class CacheService {
  private store: Map<string, CacheEntry<any>> = new Map()
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 3600000, // 1 hour
      maxSize: config.maxSize || 1000,
      cleanupInterval: config.cleanupInterval || 60000 // 1 minute
    }

    // Start cleanup interval
    setInterval(() => this.cleanup(), this.config.cleanupInterval)
  }

  // Set value in cache
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.config.maxSize) {
      const firstKey = this.store.keys().next().value
      this.store.delete(firstKey)
    }

    const expiresAt = Date.now() + (ttl || this.config.defaultTTL)
    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    })
  }

  // Get value from cache
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.value as T
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }

    return true
  }

  // Delete specific key
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  // Clear all entries
  clear(): void {
    this.store.clear()
  }

  // Clear entries matching pattern
  clearPattern(pattern: string): number {
    let count = 0
    const regex = new RegExp(pattern)

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key)
        count++
      }
    }

    return count
  }

  // Get or set - fetch if not in cache
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await fetcher()
    this.set(key, value, ttl)
    return value
  }

  // Cleanup expired entries
  private cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        removed++
      }
    }

    return removed
  }

  // Get statistics
  getStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.store.size,
      hits: 0,
      misses: 0
    }
  }
}

export const cache = new CacheService()
