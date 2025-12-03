import { NextResponse } from 'next/server';
import { listAllFiles } from '@/lib/file-storage';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint for local file storage
 * Lists all files in the uploads directory
 */
export async function GET() {
  try {
    const files = await listAllFiles();

    // Group files by folder
    const folderStats: Record<string, { count: number; totalSize: number }> = {};

    for (const file of files) {
      const folder = file.folder || '(root)';
      if (!folderStats[folder]) {
        folderStats[folder] = { count: 0, totalSize: 0 };
      }
      folderStats[folder].count++;
      folderStats[folder].totalSize += file.size;
    }

    return NextResponse.json({
      success: true,
      message: 'Local file storage is active',
      storageType: 'local',
      uploadDirectory: process.env.UPLOAD_DIR || './uploads',
      folderFormat: 'dd-mm-yyyy - task title',
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      folderStats,
      recentFiles: files.slice(0, 10).map(f => ({
        path: f.path,
        folder: f.folder,
        size: f.size,
        createdAt: f.createdAt
      }))
    });

  } catch (error) {
    console.error('Storage test failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      storageType: 'local',
      uploadDirectory: process.env.UPLOAD_DIR || './uploads',
    }, { status: 500 });
  }
}
