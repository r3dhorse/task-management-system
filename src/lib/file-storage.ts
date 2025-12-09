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
  folderPath: string
}

export class FileStorageError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = "FileStorageError"
  }
}

/**
 * Sanitize task number to prevent path traversal attacks
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function sanitizeTaskNumber(taskNumber: string): string {
  // Remove any characters that could be used for path traversal
  // Only allow alphanumeric, hyphens, and underscores
  return taskNumber.replace(/[^a-zA-Z0-9\-_]/g, '')
}

/**
 * Generate folder name in format: dd-mm-yyyy - task#
 * Uses task number which is unique per task
 */
export function generateFolderName(taskNumber: string, date?: Date): string {
  const dateObj = date || new Date()
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = dateObj.getFullYear()

  // Sanitize taskNumber to prevent path traversal attacks
  const safeTaskNumber = sanitizeTaskNumber(taskNumber)

  return `${day}-${month}-${year} - ${safeTaskNumber}`
}

/**
 * Ensure a directory exists, creating it if necessary
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

/**
 * Ensure the base upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  await ensureDir(UPLOAD_DIR)
}

/**
 * Upload a file to local storage with organized folder structure
 * Folder format: dd-mm-yyyy - task#
 */
export async function uploadFile(
  file: File,
  fileType: FileType = "task",
  taskNumber?: string
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

  // Generate unique file ID
  const fileId = randomUUID()
  const extension = path.extname(file.name)
  const fileName = `${fileId}${extension}`

  // Determine folder path
  let folderPath: string
  if (taskNumber) {
    // Use task-specific folder: uploads/dd-mm-yyyy - task#/
    const folderName = generateFolderName(taskNumber)
    folderPath = path.join(UPLOAD_DIR, folderName)
  } else {
    // Fallback: use date-only folder: uploads/dd-mm-yyyy/
    const dateObj = new Date()
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    folderPath = path.join(UPLOAD_DIR, `${day}-${month}-${year}`)
  }

  // Ensure folder exists
  await ensureDir(folderPath)

  const filePath = path.join(folderPath, fileName)

  try {
    // Convert File to Buffer and write to disk
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(filePath, buffer)

    // Return relative path from uploads directory for storage in database
    const relativeFilePath = path.relative(UPLOAD_DIR, filePath)

    return {
      id: fileId,
      fileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      filePath: relativeFilePath,
      folderPath: path.relative(UPLOAD_DIR, folderPath),
    }
  } catch (error) {
    throw new FileStorageError(
      `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      "UPLOAD_FAILED"
    )
  }
}

/**
 * Get file metadata and absolute path by file ID
 * Searches through all folders to find the file
 */
export async function getFile(fileId: string): Promise<{
  filePath: string
  fileName: string
  mimeType: string
} | null> {
  try {
    await ensureUploadDir()

    // First, try to find the file in the root uploads directory (legacy files)
    const rootFiles = await fs.readdir(UPLOAD_DIR)
    for (const item of rootFiles) {
      const itemPath = path.join(UPLOAD_DIR, item)
      const stat = await fs.stat(itemPath)

      if (stat.isFile() && item.startsWith(fileId)) {
        return createFileResult(itemPath, item)
      }
    }

    // Search in subdirectories (new folder structure)
    for (const item of rootFiles) {
      const itemPath = path.join(UPLOAD_DIR, item)
      const stat = await fs.stat(itemPath)

      if (stat.isDirectory()) {
        const subFiles = await fs.readdir(itemPath)
        const fileName = subFiles.find(f => f.startsWith(fileId))

        if (fileName) {
          const filePath = path.join(itemPath, fileName)
          return createFileResult(filePath, fileName)
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Get file by relative path (stored in database)
 * Includes path traversal protection
 */
export async function getFileByPath(relativePath: string): Promise<{
  filePath: string
  fileName: string
  mimeType: string
} | null> {
  try {
    // Prevent path traversal attacks
    const normalizedPath = path.normalize(relativePath)
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return null
    }

    const absolutePath = path.join(UPLOAD_DIR, normalizedPath)

    // Ensure the resolved path is still within UPLOAD_DIR
    const resolvedUploadDir = path.resolve(UPLOAD_DIR)
    const resolvedPath = path.resolve(absolutePath)
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return null
    }

    await fs.access(absolutePath)

    const fileName = path.basename(relativePath)
    return createFileResult(absolutePath, fileName)
  } catch {
    return null
  }
}

/**
 * Helper to create file result with MIME type detection
 */
function createFileResult(filePath: string, fileName: string): {
  filePath: string
  fileName: string
  mimeType: string
} {
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
}

/**
 * Delete a file by ID
 * Searches through all folders to find and delete the file
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const file = await getFile(fileId)
    if (!file) return false

    await fs.unlink(file.filePath)

    // Try to remove empty parent folder
    const parentDir = path.dirname(file.filePath)
    if (parentDir !== UPLOAD_DIR) {
      try {
        const remainingFiles = await fs.readdir(parentDir)
        if (remainingFiles.length === 0) {
          await fs.rmdir(parentDir)
        }
      } catch {
        // Ignore errors when trying to remove folder
      }
    }

    return true
  } catch {
    return false
  }
}

/**
 * Delete a file by relative path
 * Includes path traversal protection
 */
export async function deleteFileByPath(relativePath: string): Promise<boolean> {
  try {
    // Prevent path traversal attacks
    const normalizedPath = path.normalize(relativePath)
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return false
    }

    const absolutePath = path.join(UPLOAD_DIR, normalizedPath)

    // Ensure the resolved path is still within UPLOAD_DIR
    const resolvedUploadDir = path.resolve(UPLOAD_DIR)
    const resolvedPath = path.resolve(absolutePath)
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return false
    }

    await fs.unlink(absolutePath)

    // Try to remove empty parent folder
    const parentDir = path.dirname(absolutePath)
    if (parentDir !== resolvedUploadDir) {
      try {
        const remainingFiles = await fs.readdir(parentDir)
        if (remainingFiles.length === 0) {
          await fs.rmdir(parentDir)
        }
      } catch {
        // Ignore errors when trying to remove folder
      }
    }

    return true
  } catch {
    return false
  }
}

/**
 * Get public URL for file download
 */
export function getPublicFileUrl(fileId: string): string {
  return `/api/download/${fileId}`
}

/**
 * List all files in the uploads directory (for debugging/admin)
 */
export async function listAllFiles(): Promise<Array<{
  path: string
  folder: string
  fileName: string
  size: number
  createdAt: Date
}>> {
  const files: Array<{
    path: string
    folder: string
    fileName: string
    size: number
    createdAt: Date
  }> = []

  try {
    await ensureUploadDir()
    const items = await fs.readdir(UPLOAD_DIR)

    for (const item of items) {
      const itemPath = path.join(UPLOAD_DIR, item)
      const stat = await fs.stat(itemPath)

      if (stat.isFile()) {
        files.push({
          path: item,
          folder: '',
          fileName: item,
          size: stat.size,
          createdAt: stat.birthtime,
        })
      } else if (stat.isDirectory()) {
        const subFiles = await fs.readdir(itemPath)
        for (const subFile of subFiles) {
          const subPath = path.join(itemPath, subFile)
          const subStat = await fs.stat(subPath)
          if (subStat.isFile()) {
            files.push({
              path: path.join(item, subFile),
              folder: item,
              fileName: subFile,
              size: subStat.size,
              createdAt: subStat.birthtime,
            })
          }
        }
      }
    }
  } catch {
    // Silently fail - this is an admin utility function
  }

  return files
}
