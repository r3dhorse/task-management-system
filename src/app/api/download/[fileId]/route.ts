import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/file-storage";
import { getCurrentUser } from "@/lib/auth-utils";
import { promises as fs } from "fs";
import { prisma } from "@/lib/prisma";

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

    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Get file info from storage
    const fileInfo = await getFile(fileId);
    
    if (!fileInfo) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
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
    }

    // Read file from disk
    const fileBuffer = await fs.readFile(fileInfo.filePath);
    
    // For images, use inline disposition to allow viewing in browser
    // For PDFs and other files, use attachment to force download
    const isImage = fileInfo.mimeType.startsWith('image/');
    const disposition = isImage 
      ? `inline; filename="${fileInfo.fileName}"`
      : `attachment; filename="${fileInfo.fileName}"`;

    // Return the file as a response with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": fileInfo.mimeType,
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File download error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}