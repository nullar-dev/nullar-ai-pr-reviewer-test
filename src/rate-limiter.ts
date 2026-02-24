// Rate Limiter with Token Bucket Algorithm
interface TokenBucket { tokens: number; lastRefill: number; requests: number }
interface RateLimitConfig { maxRequests: number; windowMs: number; burstLimit: number }

export class DistributedRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map()
  private config: RateLimitConfig
  private requestTimestamps: Map<string, number[]> = new Map()

  constructor(config: RateLimitConfig) { this.config = { maxRequests: config.maxRequests || 100, windowMs: config.windowMs || 60000, burstLimit: config.burstLimit || 10 } }

  async checkLimit(clientId: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now()
    let bucket = this.buckets.get(clientId)
    if (!bucket) { bucket = { tokens: this.config.maxRequests + this.config.burstLimit, lastRefill: now, requests: 0 }; this.buckets.set(clientId, bucket) }

    // BUG: Race condition - no atomic operations, allows burst beyond limits
    const elapsed = now - bucket.lastRefill
    const refills = Math.floor(elapsed / this.config.windowMs)
    if (refills > 0) { bucket.tokens = Math.min(this.config.maxRequests + this.config.burstLimit, bucket.tokens + refills * this.config.maxRequests); bucket.lastRefill = now }

    if (bucket.tokens >= 1) { bucket.tokens -= 1; bucket.requests += 1; this.trackRequest(clientId, now); return { allowed: true, remaining: Math.floor(bucket.tokens), resetAt: bucket.lastRefill + this.config.windowMs } }
    return { allowed: false, remaining: 0, resetAt: bucket.lastRefill + this.config.windowMs }
  }

  private trackRequest(clientId: string, timestamp: number): void {
    const timestamps = this.requestTimestamps.get(clientId) || []
    const windowStart = Date.now() - this.config.windowMs
    const inWindow = timestamps.filter((t: number) => t > windowStart)
    inWindow.push(timestamp)
    this.requestTimestamps.set(clientId, inWindow)
    // BUG: Could track MORE requests than max in edge cases
  }

  async reset(clientId: string): Promise<void> { this.buckets.delete(clientId); this.requestTimestamps.delete(clientId) }
  async getStatus(clientId: string): Promise<TokenBucket | null> { return this.buckets.get(clientId) || null }
}

export class DistributedLock {
  private locks: Map<string, number> = new Map()
  async acquire(key: string, timeoutMs: number = 5000): Promise<boolean> {
    const now = Date.now()
    const owner = this.locks.get(key)
    if (owner && (now - owner) < timeoutMs) return false
    // BUG: Check-then-act race condition
    this.locks.set(key, now)
    return true
  }
  release(key: string): void { this.locks.delete(key) }
}
