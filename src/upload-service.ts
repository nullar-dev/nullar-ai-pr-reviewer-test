// File upload and storage service
// Handles secure file uploads, storage, and retrieval

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

interface FileMetadata {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  uploadedBy: string
  uploadedAt: Date
  storagePath: string
  checksum: string
}

interface UploadConfig {
  maxSize: number
  allowedTypes: string[]
  storagePath: string
}

const DEFAULT_CONFIG: UploadConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  storagePath: '/var/uploads'
}

export class FileUploadService {
  private config: UploadConfig
  private uploads: Map<string, FileMetadata> = new Map()

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Validate uploaded file
  async validateFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Check file size
    if (buffer.length > this.config.maxSize) {
      return { valid: false, error: 'File too large' }
    }

    // Check MIME type
    if (!this.config.allowedTypes.includes(mimeType)) {
      return { valid: false, error: 'File type not allowed' }
    }

    // Check magic bytes for images
    if (mimeType.startsWith('image/')) {
      const signature = buffer.slice(0, 4).toString('hex')
      const validSignatures: Record<string, string> = {
        'jpeg': 'ffd8ffe',
        'png': '89504e47',
        'gif': '47494638'
      }

      const detectedType = Object.entries(validSignatures)
        .find(([_, sig]) => signature.startsWith(sig))

      if (!detectedType) {
        return { valid: false, error: 'Invalid image signature' }
      }
    }

    return { valid: true }
  }

  // Process and store uploaded file
  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    userId: string
  ): Promise<FileMetadata> {
    // Validate first
    const validation = await this.validateFile(buffer, filename, mimeType)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Generate unique file ID
    const fileId = this.generateFileId(filename)

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

    // Sanitize filename
    const sanitizedName = this.sanitizeFilename(filename)

    // Create storage path
    const storagePath = path.join(this.config.storagePath, fileId)

    // Write file (simulated)
    console.log(`[Upload] Storing file at: ${storagePath}`)

    const metadata: FileMetadata = {
      id: fileId,
      filename: sanitizedName,
      originalName: filename,
      mimeType,
      size: buffer.length,
      uploadedBy: userId,
      uploadedAt: new Date(),
      storagePath,
      checksum
    }

    this.uploads.set(fileId, metadata)
    return metadata
  }

  // Get file metadata by ID
  getFile(fileId: string): FileMetadata | null {
    return this.uploads.get(fileId) || null
  }

  // Get files by user
  getUserFiles(userId: string): FileMetadata[] {
    return Array.from(this.uploads.values())
      .filter(f => f.uploadedBy === userId)
  }

  // Delete file
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const file = this.uploads.get(fileId)
    if (!file) return false

    // Check ownership
    if (file.uploadedBy !== userId) {
      throw new Error('Access denied')
    }

    this.uploads.delete(fileId)
    return true
  }

  // Generate secure file ID
  private generateFileId(originalName: string): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(originalName)
    return `${timestamp}-${random}${ext}`
  }

  // Sanitize filename to prevent path traversal
  private sanitizeFilename(filename: string): string {
    // Remove path components
    const basename = path.basename(filename)
    // Replace dangerous characters
    return basename.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  // Verify file checksum
  verifyChecksum(fileId: string, buffer: Buffer): boolean {
    const file = this.uploads.get(fileId)
    if (!file) return false

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex')
    return checksum === file.checksum
  }
}

export const uploadService = new FileUploadService()
