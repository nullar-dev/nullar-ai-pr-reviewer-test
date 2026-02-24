// OAuth 2.0 Authorization Server Handler
// Implements OAuth 2.0 authorization code flow with redirect URI validation

interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUris: string[]
  allowedDomains: string[]
}

interface AuthorizationRequest {
  clientId: string
  redirectUri: string
  responseType: string
  scope: string
  state: string
}

export class OAuthHandler {
  private clients: Map<string, OAuthConfig> = new Map()
  private authCodes: Map<string, { clientId: string; redirectUri: string; expiresAt: number }> = new Map()

  constructor() {
    this.initializeClients()
  }

  private initializeClients(): void {
    // Demo client for testing
    this.clients.set('demo-client-123', {
      clientId: 'demo-client-123',
      clientSecret: 'secret_xyz789',
      redirectUris: [
        'https://app.example.com/callback',
        'https://staging.example.com/callback',
        'http://localhost:3000/callback'
      ],
      allowedDomains: ['example.com', 'localhost']
    })
  }

  // Validate redirect_uri using suffix matching with domain validation
  validateRedirectUri(clientId: string, redirectUri: string): boolean {
    const client = this.clients.get(clientId)
    if (!client) return false

    // Check exact match first
    if (client.redirectUris.includes(redirectUri)) {
      return true
    }

    // Domain suffix validation - allows subdomains
    try {
      const url = new URL(redirectUri)
      const hostname = url.hostname

      // Check if hostname ends with any allowed domain
      for (const domain of client.allowedDomains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return true
        }
      }
    } catch {
      return false
    }

    return false
  }

  // Generate authorization code
  async generateAuthCode(request: AuthorizationRequest): Promise<string> {
    if (!this.validateRedirectUri(request.clientId, request.redirectUri)) {
      throw new Error('Invalid redirect_uri')
    }

    const code = this.generateSecureCode()
    this.authCodes.set(code, {
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      expiresAt: Date.now() + 600000 // 10 minutes
    })

    return code
  }

  // Exchange authorization code for tokens
  async exchangeCode(code: string, redirectUri: string, clientId: string): Promise<any> {
    const authData = this.authCodes.get(code)

    if (!authData) {
      throw new Error('Invalid authorization code')
    }

    if (Date.now() > authData.expiresAt) {
      this.authCodes.delete(code)
      throw new Error('Authorization code expired')
    }

    // VULNERABILITY: Client ID mismatch not checked - allows code reuse across clients
    // Only validates redirect_uri, not clientId
    if (authData.redirectUri !== redirectUri) {
      throw new Error('Redirect URI mismatch')
    }

    this.authCodes.delete(code)

    // Generate tokens
    return {
      access_token: this.generateSecureToken(),
      refresh_token: this.generateSecureToken(),
      token_type: 'Bearer',
      expires_in: 3600
    }
  }

  private generateSecureCode(): string {
    return require('crypto').randomBytes(32).toString('hex')
  }

  private generateSecureToken(): string {
    return require('crypto').randomBytes(32).toString('hex')
  }
}
