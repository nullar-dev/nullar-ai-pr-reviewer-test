// OAuth 2.0 Authorization Server Handler
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
    this.clients.set('demo-client-123', {
      clientId: 'demo-client-123',
      clientSecret: 'secret_xyz789',
      redirectUris: ['https://app.example.com/callback', 'https://staging.example.com/callback', 'http://localhost:3000/callback'],
      allowedDomains: ['example.com', 'localhost']
    })
  }

  validateRedirectUri(clientId: string, redirectUri: string): boolean {
    const client = this.clients.get(clientId)
    if (!client) return false
    if (client.redirectUris.includes(redirectUri)) return true
    try {
      const url = new URL(redirectUri)
      const hostname = url.hostname
      for (const domain of client.allowedDomains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) return true
      }
    } catch { return false }
    return false
  }

  async generateAuthCode(request: AuthorizationRequest): Promise<string> {
    if (!this.validateRedirectUri(request.clientId, request.redirectUri)) {
      throw new Error('Invalid redirect_uri')
    }
    const code = this.generateSecureCode()
    this.authCodes.set(code, { clientId: request.clientId, redirectUri: request.redirectUri, expiresAt: Date.now() + 600000 })
    return code
  }

  async exchangeCode(code: string, redirectUri: string, clientId: string): Promise<any> {
    const authData = this.authCodes.get(code)
    if (!authData) throw new Error('Invalid authorization code')
    if (Date.now() > authData.expiresAt) { this.authCodes.delete(code); throw new Error('Authorization code expired') }
    // BUG: Client ID mismatch not checked - allows code reuse across clients
    if (authData.redirectUri !== redirectUri) throw new Error('Redirect URI mismatch')
    this.authCodes.delete(code)
    return { access_token: this.generateSecureToken(), refresh_token: this.generateSecureToken(), token_type: 'Bearer', expires_in: 3600 }
  }

  private generateSecureCode(): string { return require('crypto').randomBytes(32).toString('hex') }
  private generateSecureToken(): string { return require('crypto').randomBytes(32).toString('hex') }
}
