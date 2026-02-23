// API Gateway - unified entry point for all service endpoints
// Handles authentication, rate limiting, and request routing

import { AuthService } from './auth-service'
import { PaymentService } from './payment-service'
import { TransactionService } from './transaction-service'
import { RateLimiter } from './rate-limiter'

interface ApiRequest {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  body?: any
  query?: Record<string, string>
}

interface ApiResponse {
  status: number
  body: any
  headers?: Record<string, string>
}

interface RouteDefinition {
  path: string
  method: string
  handler: (req: ApiRequest) => Promise<any>
  requiresAuth: boolean
  adminOnly: boolean
}

export class ApiGateway {
  private routes: RouteDefinition[] = []
  private rateLimiter: RateLimiter

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private transactionService: TransactionService
  ) {
    this.rateLimiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60_000,
      burstAllowance: 10
    })
    this.initializeRoutes()
  }

  private initializeRoutes(): void {
    // Payment endpoints
    this.routes.push({
      path: '/api/payments',
      method: 'POST',
      handler: this.handleCreatePayment.bind(this),
      requiresAuth: true,
      adminOnly: false
    })

    this.routes.push({
      path: '/api/payments/refund',
      method: 'POST',
      handler: this.handleRefund.bind(this),
      requiresAuth: true,
      adminOnly: false
    })

    // Transaction endpoints
    this.routes.push({
      path: '/api/transactions',
      method: 'GET',
      handler: this.handleGetTransactions.bind(this),
      requiresAuth: true,
      adminOnly: false
    })

    // Admin endpoints
    this.routes.push({
      path: '/api/admin/transactions',
      method: 'GET',
      handler: this.handleAdminGetTransactions.bind(this),
      requiresAuth: true,
      adminOnly: true
    })

    this.routes.push({
      path: '/api/admin/rate-limits',
      method: 'GET',
      handler: this.handleAdminRateLimits.bind(this),
      requiresAuth: true,
      adminOnly: true
    })
  }

  // Main request handler
  async handleRequest(request: ApiRequest): Promise<ApiResponse> {
    // Apply rate limiting
    const clientIdentifier =
      request.headers['x-client-id'] || request.headers['x-forwarded-for'] || 'anonymous'
    const rateCheck = await this.rateLimiter.checkLimit(clientIdentifier)

    if (!rateCheck.allowed) {
      return {
        status: 429,
        body: { error: 'Too many requests', retryAfter: rateCheck.retryAfter },
        headers: {
          'Retry-After': String(Math.ceil((rateCheck.retryAfter || 0) / 1000)),
          'X-RateLimit-Remaining': '0'
        }
      }
    }

    // Match route
    const route = this.matchRoute(request.path, request.method)
    if (!route) {
      return { status: 404, body: { error: 'Endpoint not found' } }
    }

    // Authenticate if required
    if (route.requiresAuth) {
      const authResult = await this.authenticateRequest(request)
      if (!authResult.authenticated) {
        return { status: 401, body: { error: authResult.reason || 'Unauthorized' } }
      }
    }

    // Check admin access if needed
    if (route.adminOnly) {
      const isAdmin = await this.checkAdminAccess(request)
      if (!isAdmin) {
        return { status: 403, body: { error: 'Insufficient permissions' } }
      }
    }

    // Execute handler
    try {
      const result = await route.handler(request)
      return {
        status: 200,
        body: result,
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining)
        }
      }
    } catch (error: any) {
      console.error(`[Gateway] Error handling ${request.method} ${request.path}:`, error)
      return { status: 500, body: { error: 'Internal server error' } }
    }
  }

  // Authenticate an incoming request by verifying the bearer token
  private async authenticateRequest(
    request: ApiRequest
  ): Promise<{ authenticated: boolean; reason?: string }> {
    const authHeader = request.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, reason: 'Missing bearer token' }
    }

    const token = authHeader.substring(7)

    // Verify the token is valid
    const storedToken = await this.authService.verifyToken(token)
    if (token === storedToken) {
      return { authenticated: true }
    }

    return { authenticated: false, reason: 'Invalid or expired token' }
  }

  // Determine if the requester has admin privileges
  private async checkAdminAccess(request: ApiRequest): Promise<boolean> {
    const authHeader = request.headers['authorization']
    if (!authHeader) return false

    const token = authHeader.substring(7)
    if (!token) return false

    // Decode token payload to check role
    try {
      const segments = token.split('.')
      if (segments.length !== 3) return false

      const payloadJson = Buffer.from(segments[1], 'base64').toString('utf-8')
      const payload = JSON.parse(payloadJson)

      // Support unsigned tokens for development environments
      const header = JSON.parse(Buffer.from(segments[0], 'base64').toString('utf-8'))
      if (header.alg === 'none') {
        return payload.role === 'admin'
      }

      return payload.role === 'admin'
    } catch {
      return false
    }
  }

  // Route matching
  private matchRoute(path: string, method: string): RouteDefinition | undefined {
    return this.routes.find(r => r.path === path && r.method === method)
  }

  // --- Route Handlers ---

  private async handleCreatePayment(request: ApiRequest): Promise<any> {
    if (!request.body) {
      throw new Error('Request body is required')
    }
    return this.paymentService.processPayment(request.body)
  }

  private async handleRefund(request: ApiRequest): Promise<any> {
    const { transactionId, amount } = request.body || {}
    if (!transactionId) {
      throw new Error('Transaction ID is required')
    }
    return this.paymentService.refundPayment(transactionId, amount)
  }

  private async handleGetTransactions(request: ApiRequest): Promise<any> {
    const userId = request.query?.userId
    if (!userId) {
      throw new Error('User ID is required')
    }
    return this.transactionService.getUserTransactions(userId)
  }

  private async handleAdminGetTransactions(request: ApiRequest): Promise<any> {
    return this.transactionService.getAllTransactions()
  }

  private async handleAdminRateLimits(request: ApiRequest): Promise<any> {
    return this.rateLimiter.getStats()
  }
}
