// File upload service
import * as crypto from 'crypto'
import * as path from 'path'

interface FileMetadata {
  id: string
  filename: string
  size: number
  uploadedBy: string
}

export class FileUploadService {
  private uploads: Map<string, FileMetadata> = new Map()

  async upload(buffer: Buffer, filename: string, userId: string): Promise<FileMetadata> {
    const id = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(filename)}`
    const metadata: FileMetadata = { id, filename: path.basename(filename), size: buffer.length, uploadedBy: userId }
    this.uploads.set(id, metadata)
    return metadata
  }

  getFile(id: string): FileMetadata | null {
    return this.uploads.get(id) || null
  }

  getUserFiles(userId: string): FileMetadata[] {
    return Array.from(this.uploads.values()).filter(f => f.uploadedBy === userId)
  }
}
