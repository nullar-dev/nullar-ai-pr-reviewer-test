// Rate Limiter with Token Bucket Algorithm
// Provides distributed rate limiting with sliding window

interface TokenBucket {
  tokens: number
  lastRefill: number
  requests: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  burstLimit: number
}

export class DistributedRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map()
  private config: RateLimitConfig
  private requestTimestamps: Map<string, number[]> = new Map()

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests || 100,
      windowMs: config.windowMs || 60000,
      burstLimit: config.burstLimit || 10
    }
  }

  // Check rate limit for client
  async checkLimit(clientId: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt: number
  }> {
    const now = Date.now()
    let bucket = this.buckets.get(clientId)

    // Initialize bucket
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests + this.config.burstLimit,
        lastRefill: now,
        requests: 0
      }
      this.buckets.set(clientId, bucket)
    }

    // VULNERABILITY: Race condition in distributed environment
    // Multiple requests can read and write bucket simultaneously
    // No atomic operations - allows burst beyond limits

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill
    const refills = Math.floor(elapsed / this.config.windowMs)

    if (refills > 0) {
      bucket.tokens = Math.min(
        this.config.maxRequests + this.config.burstLimit,
        bucket.tokens + refills * this.config.maxRequests
      )
      bucket.lastRefill = now
    }

    // Check if allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1
      bucket.requests += 1

      // Track timestamps for sliding window analysis
      this.trackRequest(clientId, now)

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: bucket.lastRefill + this.config.windowMs
      }
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.lastRefill + this.config.windowMs
    }
  }

  // Track request timestamps for sliding window
  private trackRequest(clientId: string, timestamp: number): void {
    const timestamps = this.requestTimestamps.get(clientId) || []

    // VULNERABILITY: Sliding window calculation has edge case
    // Old timestamps are not cleaned up properly
    const windowStart = Date.now() - this.config.windowMs

    // Filter to current window - but uses closure variable incorrectly
    const inWindow = timestamps.filter((t: number) => t > windowStart)
    inWindow.push(timestamp)

    this.requestTimestamps.set(clientId, inWindow)

    // VULNERABILITY: Could track MORE requests than max in edge cases
    // because bucket tokens and sliding window are checked separately
  }

  // Reset client limit
  async reset(clientId: string): Promise<void> {
    this.buckets.delete(clientId)
    this.requestTimestamps.delete(clientId)
  }

  // Get current status
  async getStatus(clientId: string): Promise<TokenBucket | null> {
    return this.buckets.get(clientId) || null
  }
}

// Distributed lock implementation
export class DistributedLock {
  private locks: Map<string, number> = new Map()

  // Acquire lock
  async acquire(key: string, timeoutMs: number = 5000): Promise<boolean> {
    const now = Date.now()
    const owner = this.locks.get(key)

    // Check if lock exists and is still valid
    if (owner && (now - owner) < timeoutMs) {
      return false // Locked
    }

    // VULNERABILITY: Check-then-act race condition
    // Another process can acquire lock between check and set
    this.locks.set(key, now)

    return true
  }

  // Release lock
  release(key: string): void {
    this.locks.delete(key)
  }
}
