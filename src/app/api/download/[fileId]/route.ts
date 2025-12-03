import { NextRequest, NextResponse } from "next/server";
import { getFile, getFileByPath } from "@/lib/file-storage";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";

export const dynamic = 'force-dynamic';

interface RouteProps {
  params: {
    fileId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let { fileId } = params;

    // Decode the fileId in case it's URL encoded
    fileId = decodeURIComponent(fileId);

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Check if user has access to this file
    // First check if it's a task attachment
    const taskAttachment = await prisma.taskAttachment.findFirst({
      where: { id: fileId },
      include: {
        task: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId: user.id },
                },
              },
            },
          },
        },
      },
    });

    if (taskAttachment) {
      // User must be a member of the workspace
      if (taskAttachment.task.workspace.members.length === 0) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      try {
        // Get file from local storage using the relative path stored in DB
        const localFile = await getFileByPath(taskAttachment.filePath);

        if (!localFile) {
          // Fallback: try searching by file ID
          const fallbackFile = await getFile(taskAttachment.id);
          if (!fallbackFile) {
            throw new Error('File not found in local storage');
          }
          return serveFile(fallbackFile.filePath, taskAttachment.mimeType, taskAttachment.originalName);
        }

        return serveFile(localFile.filePath, taskAttachment.mimeType, taskAttachment.originalName);
      } catch (error) {
        console.error("File download error:", error);
        return NextResponse.json(
          { error: "File not found in storage" },
          { status: 404 }
        );
      }
    }

    // Check if it's a message attachment by file ID
    const messageAttachment = await prisma.taskMessage.findFirst({
      where: { attachmentId: fileId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (messageAttachment) {
      // User must be a member of the workspace
      if (messageAttachment.workspace.members.length === 0) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      try {
        // For message attachments, attachmentId is the file ID
        // Try to find the file in local storage
        const localFile = await getFile(fileId);

        if (!localFile) {
          // If not found by ID, the fileId might be a relative path
          const fileByPath = await getFileByPath(fileId);
          if (!fileByPath) {
            throw new Error('File not found in local storage');
          }
          return serveFile(
            fileByPath.filePath,
            messageAttachment.attachmentType || 'application/octet-stream',
            messageAttachment.attachmentName || 'attachment'
          );
        }

        return serveFile(
          localFile.filePath,
          messageAttachment.attachmentType || localFile.mimeType,
          messageAttachment.attachmentName || 'attachment'
        );
      } catch (error) {
        console.error("Message attachment download error:", error);
        return NextResponse.json(
          { error: "File not found in storage" },
          { status: 404 }
        );
      }
    }

    // If not found in database, try to find by file ID in storage directly
    // This handles legacy files or direct file ID access
    const directFile = await getFile(fileId);
    if (directFile) {
      // For direct file access without database record, we still need to verify access
      // Since we can't verify workspace membership, we'll allow it if the user is authenticated
      // This is a fallback for edge cases
      console.log('Serving file directly by ID (no database record):', fileId);
      return serveFile(directFile.filePath, directFile.mimeType, directFile.fileName);
    }

    // If fileId contains path separators, try as a relative path
    if (fileId.includes('/') || fileId.includes('\\')) {
      const fileByPath = await getFileByPath(fileId);
      if (fileByPath) {
        console.log('Serving file by path:', fileId);
        return serveFile(fileByPath.filePath, fileByPath.mimeType, fileByPath.fileName);
      }
    }

    // If not found anywhere
    return NextResponse.json(
      { error: "File not found or access denied" },
      { status: 404 }
    );

  } catch (error) {
    console.error("File download error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to serve a file with proper headers
 */
async function serveFile(filePath: string, mimeType: string, originalName: string): Promise<NextResponse> {
  const fileBuffer = await readFile(filePath);

  // For images, use inline disposition to allow viewing in browser
  // For PDFs and other files, use attachment to force download
  const isImage = mimeType.startsWith('image/');
  const disposition = isImage
    ? `inline; filename="${encodeURIComponent(originalName)}"`
    : `attachment; filename="${encodeURIComponent(originalName)}"`;

  // Return the file as a response with proper headers
  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": disposition,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
