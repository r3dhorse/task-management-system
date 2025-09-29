import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads"
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760") // 10MB default

export type FileType = "task" | "message"

export interface UploadResult {
  id: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  filePath: string
}

export class FileStorageError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = "FileStorageError"
  }
}

async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function uploadFile(
  file: File,
  fileType: FileType = "task"
): Promise<UploadResult> {
  await ensureUploadDir()

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new FileStorageError(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`,
      "FILE_TOO_LARGE"
    )
  }

  // Validate file type based on usage
  const allowedTypes = {
    task: ["application/pdf"],
    message: ["application/pdf", "image/jpeg", "image/png", "image/svg+xml"],
  }

  if (!allowedTypes[fileType].includes(file.type)) {
    throw new FileStorageError(
      `File type ${file.type} not allowed for ${fileType}`,
      "INVALID_FILE_TYPE"
    )
  }

  // Generate unique file ID and name
  const fileId = randomUUID()
  const extension = path.extname(file.name)
  const fileName = `${fileId}${extension}`
  const filePath = path.join(UPLOAD_DIR, fileName)

  try {
    // Convert File to Buffer and write to disk
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(filePath, buffer)

    return {
      id: fileId,
      fileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      filePath,
    }
  } catch (error) {
    throw new FileStorageError(
      `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      "UPLOAD_FAILED"
    )
  }
}

export async function getFile(fileId: string): Promise<{
  filePath: string
  fileName: string
  mimeType: string
} | null> {
  try {
    // In a real implementation, you'd query the database to get file metadata
    // For now, we'll assume the file exists and try to find it
    const files = await fs.readdir(UPLOAD_DIR)
    const fileName = files.find(f => f.startsWith(fileId))
    
    if (!fileName) return null

    const filePath = path.join(UPLOAD_DIR, fileName)
    
    // Basic MIME type detection based on extension
    const extension = path.extname(fileName).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    }
    
    const mimeType = mimeTypes[extension] || 'application/octet-stream'

    return {
      filePath,
      fileName,
      mimeType,
    }
  } catch {
    return null
  }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const files = await fs.readdir(UPLOAD_DIR)
    const fileName = files.find(f => f.startsWith(fileId))
    
    if (!fileName) return false

    const filePath = path.join(UPLOAD_DIR, fileName)
    await fs.unlink(filePath)
    return true
  } catch {
    return false
  }
}

export function getPublicFileUrl(fileId: string): string {
  return `/api/download/${fileId}`
}