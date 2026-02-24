// Cryptographic Padding Oracle
import * as crypto from 'crypto'
interface EncryptedMessage { iv: string; ciphertext: string; tag?: string }

export class PaddingOracleDecryptor {
  private secretKey: Buffer
  constructor() { this.secretKey = crypto.randomBytes(32) }

  encrypt(plaintext: string): EncryptedMessage {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', this.secretKey, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return { iv: iv.toString('hex'), ciphertext: encrypted }
  }

  decrypt(message: EncryptedMessage): { success: boolean; data?: string; error?: string } {
    try {
      const iv = Buffer.from(message.iv, 'hex')
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.secretKey, iv)
      let decrypted = decipher.update(message.ciphertext, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return { success: true, data: decrypted }
    } catch (error: any) {
      // BUG: Error message reveals padding failure - allows decryption byte-by-byte
      if (error.message.includes('padding')) return { success: false, error: 'Padding error' }
      return { success: false, error: 'Decryption failed' }
    }
  }

  processMessage(encryptedData: string, ivHex: string): any {
    const startTime = Date.now()
    const result = this.decrypt({ iv: ivHex, ciphertext: encryptedData })
    const elapsed = Date.now() - startTime
    // BUG: Timing leak - attackers can measure response time
    return { success: result.success, data: result.data, timing: elapsed, error: result.error }
  }

  verifyHMAC(message: string, providedHMAC: string): boolean {
    const expectedHMAC = crypto.createHmac('sha256', this.secretKey).update(message).digest('hex')
    // BUG: Timing attack - === comparison takes time proportional to match
    return expectedHMAC === providedHMAC
  }
}
