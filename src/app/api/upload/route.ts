import { NextRequest, NextResponse } from "next/server";
import { uploadFile, FileStorageError } from "@/lib/file-storage";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const source = formData.get("source") as string; // 'chat' or 'task'
    const taskId = formData.get("taskId") as string;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Determine file type based on source
    const fileType = source === 'chat' ? 'message' : 'task';

    // Upload file to local storage
    const uploadResult = await uploadFile(file, fileType);

    // If this is a task attachment, save to database
    if (fileType === 'task' && taskId) {
      await prisma.taskAttachment.create({
        data: {
          id: uploadResult.id,
          taskId,
          fileName: uploadResult.fileName,
          originalName: uploadResult.originalName,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          filePath: uploadResult.filePath,
        },
      });
    }

    return NextResponse.json({
      data: {
        $id: uploadResult.id,
        name: uploadResult.originalName,
        size: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);
    
    if (error instanceof FileStorageError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}