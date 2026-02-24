// JWT Token Validator with Algorithm Handling
// Implements JWT validation with multiple algorithm support

import * as crypto from 'crypto'

interface JWTPayload {
  userId: string
  role: string
  exp?: number
  iat?: number
  [key: string]: any
}

interface JWTHeader {
  alg: string
  typ: 'JWT'
  [key: string]: any
}

export class JWTValidator {
  private secretKey: string = 'your-256-bit-secret-change-in-production'
  private algorithms: Set<string> = new Set(['HS256', 'HS384', 'HS512', 'RS256'])

  // Sign JWT token
  sign(payload: JWTPayload): string {
    const header: JWTHeader = { alg: 'HS256', typ: 'JWT' }

    const headerEncoded = this.base64UrlEncode(JSON.stringify(header))
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload))

    const signature = this.signWithAlgorithm(headerEncoded + '.' + payloadEncoded, 'HS256')

    return `${headerEncoded}.${payloadEncoded}.${signature}`
  }

  // Verify JWT token
  verify(token: string): { valid: boolean; payload?: JWTPayload; error?: string } {
    try {
      const parts = token.split('.')

      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' }
      }

      const [headerEncoded, payloadEncoded, signature] = parts

      // Decode header
      const header = JSON.parse(this.base64UrlDecode(headerEncoded)) as JWTHeader

      // VULNERABILITY: Algorithm confusion attack
      // If attacker can change 'alg' to 'none' or 'HS256' but provide RSA public key
      // as the secret, the signature verification will use wrong algorithm

      if (header.alg === 'none') {
        // VULNERABILITY: 'none' algorithm should be rejected but isn't
        // Allows unsigned tokens
        console.log('[JWT] Warning: Algorithm is none')
      }

      // Verify signature based on algorithm
      const expectedSignature = this.signWithAlgorithm(
        headerEncoded + '.' + payloadEncoded,
        header.alg
      )

      // VULNERABILITY: Timing-safe comparison not always used
      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' }
      }

      // Decode payload
      const payload = JSON.parse(this.base64UrlDecode(payloadEncoded)) as JWTPayload

      // Check expiration
      if (payload.exp && Date.now() > payload.exp * 1000) {
        return { valid: false, error: 'Token expired' }
      }

      return { valid: true, payload }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  // Verify with algorithm from header - vulnerable to algorithm confusion
  verifyWithHeaderAlg(token: string): JWTPayload | null {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const header = JSON.parse(this.base64UrlDecode(parts[0])) as JWTHeader

    // VULNERABILITY: Algorithm from header is trusted without validation
    // Could set alg to 'HS256' but use RSA key for verification
    // This is the "algorithm confusion" attack

    // Check if algorithm is allowed
    if (!this.algorithms.has(header.alg)) {
      return null // Should reject but doesn't fully
    }

    // Continue with potentially wrong algorithm
    return this.verify(token).payload || null
  }

  private signWithAlgorithm(data: string, algorithm: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('base64url')
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str).toString('base64url')
  }

  private base64UrlDecode(str: string): string {
    return Buffer.from(str, 'base64url').toString('utf8')
  }
}

// Token refresh handler
export class TokenRefreshHandler {
  private validator: JWTValidator

  constructor(validator: JWTValidator) {
    this.validator = validator
  }

  // Refresh token - issue new token with extended expiry
  refresh(oldToken: string): string | null {
    const result = this.validator.verify(oldToken)

    if (!result.valid || !result.payload) {
      return null
    }

    // Create new token with same user data but new expiry
    const newPayload: JWTPayload = {
      ...result.payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    }

    // VULNERABILITY: Old token is not invalidated
    // Both old and new tokens are valid (token reuse allowed)
    // Attacker with old token can still use it after refresh

    return this.validator.sign(newPayload)
  }
}
