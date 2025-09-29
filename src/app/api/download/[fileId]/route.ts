import { NextRequest, NextResponse } from "next/server";
import { getObjectFromS3 } from "@/lib/s3-client";
import { getFile } from "@/lib/file-storage";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";

interface RouteProps {
  params: {
    fileId: string;
  };
}

// Check if AWS S3 is configured
function isS3Configured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && 
           process.env.AWS_SECRET_ACCESS_KEY && 
           process.env.AWS_REGION);
}

// Helper function to determine if a file path is an S3 key vs local path
function isS3FilePath(filePath: string): boolean {
  return filePath.startsWith('task-management-system-2025/') || filePath.includes('/');
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

      const filePath = taskAttachment.filePath;
      const isS3File = isS3FilePath(filePath);
      
      try {
        let fileBuffer: Buffer;
        
        if (isS3File && isS3Configured()) {
          // Get file from S3
          fileBuffer = await getObjectFromS3(filePath);
        } else {
          // Get file from local storage
          const localFile = await getFile(taskAttachment.id);
          if (!localFile) {
            throw new Error('File not found in local storage');
          }
          fileBuffer = await readFile(localFile.filePath);
        }
        
        // For images, use inline disposition to allow viewing in browser
        // For PDFs and other files, use attachment to force download
        const isImage = taskAttachment.mimeType.startsWith('image/');
        const disposition = isImage 
          ? `inline; filename="${taskAttachment.originalName}"`
          : `attachment; filename="${taskAttachment.originalName}"`;

        // Return the file as a response with proper headers
        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            "Content-Type": taskAttachment.mimeType,
            "Content-Disposition": disposition,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch (error) {
        console.error("File download error:", error);
        return NextResponse.json(
          { error: "File not found in storage" },
          { status: 404 }
        );
      }
    }

    // Check if fileId looks like an S3 key (contains forward slashes)
    const isS3Key = fileId.includes('/');
    
    if (isS3Key) {
      // This is a direct S3 key from a message attachment
      // Verify user has access by checking if any message with this attachment exists
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

      if (messageAttachment && messageAttachment.workspace.members.length > 0) {
        // User has access, download from S3
        try {
          const fileBuffer = await getObjectFromS3(fileId);
          
          const isImage = (messageAttachment.attachmentType || '').startsWith('image/');
          const disposition = isImage 
            ? `inline; filename="${messageAttachment.attachmentName || 'attachment'}"`
            : `attachment; filename="${messageAttachment.attachmentName || 'attachment'}"`;

          return new NextResponse(new Uint8Array(fileBuffer), {
            headers: {
              "Content-Type": messageAttachment.attachmentType || 'application/octet-stream',
              "Content-Disposition": disposition,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (s3Error) {
          console.error("S3 download error for message attachment:", s3Error);
          return NextResponse.json(
            { error: "File not found in storage" },
            { status: 404 }
          );
        }
      }
    }
    
    // If not found as task attachment or S3 key, check for message attachments by ID
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

      // For message attachments, the attachmentId is the S3 key
      try {
        const s3Key = messageAttachment.attachmentId!; // attachmentId is the S3 key for messages
        const fileBuffer = await getObjectFromS3(s3Key);
        
        const isImage = (messageAttachment.attachmentType || '').startsWith('image/');
        const disposition = isImage 
          ? `inline; filename="${messageAttachment.attachmentName || 'attachment'}"`
          : `attachment; filename="${messageAttachment.attachmentName || 'attachment'}"`;

        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            "Content-Type": messageAttachment.attachmentType || 'application/octet-stream',
            "Content-Disposition": disposition,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch (s3Error) {
        console.error("S3 download error for message attachment:", s3Error);
        return NextResponse.json(
          { error: "File not found in storage" },
          { status: 404 }
        );
      }
    }

    // If not found as task attachment, S3 key, or message attachment
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