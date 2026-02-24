// Cryptographic Padding Oracle
// Implements AES decryption with CBC mode and PKCS7 padding

import * as crypto from 'crypto'

interface EncryptedMessage {
  iv: string
  ciphertext: string
  tag?: string
}

export class PaddingOracleDecryptor {
  private secretKey: Buffer

  constructor() {
    // 32-byte key for AES-256
    this.secretKey = crypto.randomBytes(32)
  }

  // Encrypt data with random IV
  encrypt(plaintext: string): EncryptedMessage {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', this.secretKey, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return {
      iv: iv.toString('hex'),
      ciphertext: encrypted
    }
  }

  // Decrypt with error-based oracle
  // VULNERABILITY: This exposes padding errors which can be exploited
  // to decrypt any ciphertext without knowing the key
  decrypt(message: EncryptedMessage): { success: boolean; data?: string; error?: string } {
    try {
      const iv = Buffer.from(message.iv, 'hex')
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.secretKey, iv)

      let decrypted = decipher.update(message.ciphertext, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return { success: true, data: decrypted }
    } catch (error: any) {
      // VULNERABILITY: Error message reveals padding failure
      // An attacker can use this to decrypt data byte-by-byte
      // by sending modified ciphertexts and observing error messages

      if (error.message.includes('padding')) {
        return { success: false, error: 'Padding error' }
      }
      return { success: false, error: 'Decryption failed' }
    }
  }

  // Process incoming encrypted message from user
  // VULNERABILITY: The error responses are too detailed
  processMessage(encryptedData: string, ivHex: string): any {
    // Simulate network call timing
    const startTime = Date.now()

    const result = this.decrypt({ iv: ivHex, ciphertext: encryptedData })

    const elapsed = Date.now() - startTime

    // Additional vulnerability: timing information leaks
    // Even if error messages are hidden, timing can reveal information
    return {
      success: result.success,
      data: result.data,
      timing: elapsed, // Should not be exposed!
      error: result.error // Should not expose details!
    }
  }

  // Verify HMAC - but with timing leak
  verifyHMAC(message: string, providedHMAC: string): boolean {
    const expectedHMAC = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('hex')

    // VULNERABILITY: Timing attack
    // Using === compares all bytes but takes time proportional to match
    // Attackers can measure response time to guess HMAC byte-by-byte
    return expectedHMAC === providedHMAC
  }

  // Secure comparison - but still has issues
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      // Still vulnerable to timing analysis
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }
}
