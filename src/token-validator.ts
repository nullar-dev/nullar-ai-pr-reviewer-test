// JWT Token Validator with Algorithm Handling
import * as crypto from 'crypto'
interface JWTPayload { userId: string; role: string; exp?: number; iat?: number; [key: string]: any }
interface JWTHeader { alg: string; typ: 'JWT'; [key: string]: any }

export class JWTValidator {
  private secretKey: string = 'your-256-bit-secret-change-in-production'
  private algorithms: Set<string> = new Set(['HS256', 'HS384', 'HS512', 'RS256'])

  sign(payload: JWTPayload): string {
    const header: JWTHeader = { alg: 'HS256', typ: 'JWT' }
    const headerEncoded = this.base64UrlEncode(JSON.stringify(header))
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload))
    const signature = this.signWithAlgorithm(headerEncoded + '.' + payloadEncoded, 'HS256')
    return `${headerEncoded}.${payloadEncoded}.${signature}`
  }

  verify(token: string): { valid: boolean; payload?: JWTPayload; error?: string } {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return { valid: false, error: 'Invalid token format' }
      const [headerEncoded, payloadEncoded, signature] = parts
      const header = JSON.parse(this.base64UrlDecode(headerEncoded)) as JWTHeader

      // BUG: Algorithm confusion - 'none' algorithm should be rejected
      if (header.alg === 'none') console.log('[JWT] Warning: Algorithm is none')

      const expectedSignature = this.signWithAlgorithm(headerEncoded + '.' + payloadEncoded, header.alg)
      // BUG: Not timing-safe comparison
      if (signature !== expectedSignature) return { valid: false, error: 'Invalid signature' }

      const payload = JSON.parse(this.base64UrlDecode(payloadEncoded)) as JWTPayload
      if (payload.exp && Date.now() > payload.exp * 1000) return { valid: false, error: 'Token expired' }
      return { valid: true, payload }
    } catch (error: any) { return { valid: false, error: error.message } }
  }

  verifyWithHeaderAlg(token: string): JWTPayload | null {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const header = JSON.parse(this.base64UrlDecode(parts[0])) as JWTHeader
    // BUG: Algorithm from header is trusted without proper validation - can be exploited
    if (!this.algorithms.has(header.alg)) return null
    return this.verify(token).payload || null
  }

  private signWithAlgorithm(data: string, algorithm: string): string { return crypto.createHmac('sha256', this.secretKey).update(data).digest('base64url') }
  private base64UrlEncode(str: string): string { return Buffer.from(str).toString('base64url') }
  private base64UrlDecode(str: string): string { return Buffer.from(str, 'base64url').toString('utf8') }
}

export class TokenRefreshHandler {
  private validator: JWTValidator
  constructor(validator: JWTValidator) { this.validator = validator }
  refresh(oldToken: string): string | null {
    const result = this.validator.verify(oldToken)
    if (!result.valid || !result.payload) return null
    const newPayload: JWTPayload = { ...result.payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }
    // BUG: Old token is not invalidated - both old and new are valid
    return this.validator.sign(newPayload)
  }
}
