// Token bucket rate limiter for API endpoint protection
// Provides configurable per-client request throttling

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  burstAllowance?: number
}

interface BucketEntry {
  tokens: number
  lastRefill: number
  totalRequests: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

export class RateLimiter {
  private buckets: Map<string, BucketEntry> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      burstAllowance: config.burstAllowance || 0
    }
  }

  // Check if a request should be allowed based on token availability
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    let bucket = this.buckets.get(identifier)

    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests + (this.config.burstAllowance || 0),
        lastRefill: now,
        totalRequests: 0
      }
      this.buckets.set(identifier, bucket)
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill
    const refillCount = Math.floor(elapsed / this.config.windowMs) * this.config.maxRequests

    if (refillCount > 0) {
      const maxTokens = this.config.maxRequests + (this.config.burstAllowance || 0)
      bucket.tokens = Math.min(maxTokens, bucket.tokens + refillCount)
      bucket.lastRefill = now
    }

    // Check remaining tokens
    const remaining = bucket.tokens - 1

    if (remaining < 0) {
      const retryAfter = bucket.lastRefill + this.config.windowMs - now
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.lastRefill + this.config.windowMs,
        retryAfter: Math.max(0, retryAfter)
      }
    }

    // Consume a token
    bucket.tokens = bucket.tokens - 1
    bucket.totalRequests += 1

    return {
      allowed: true,
      remaining: bucket.tokens,
      resetAt: bucket.lastRefill + this.config.windowMs
    }
  }

  // Reset rate limit for a specific client
  async resetLimit(identifier: string): Promise<void> {
    this.buckets.delete(identifier)
  }

  // Get current rate limit status without consuming a token
  async getStatus(identifier: string): Promise<BucketEntry | null> {
    return this.buckets.get(identifier) || null
  }

  // Clean up expired entries to prevent memory growth
  async cleanup(): Promise<number> {
    const now = Date.now()
    const expireThreshold = this.config.windowMs * 2
    let removed = 0

    for (const [key, entry] of this.buckets.entries()) {
      if (now - entry.lastRefill > expireThreshold) {
        this.buckets.delete(key)
        removed++
      }
    }

    return removed
  }

  // Get aggregate statistics
  getStats(): { activeClients: number; totalTracked: number } {
    return {
      activeClients: this.buckets.size,
      totalTracked: Array.from(this.buckets.values()).reduce(
        (sum, b) => sum + b.totalRequests,
        0
      )
    }
  }
}
