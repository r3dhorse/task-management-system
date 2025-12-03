import { NextRequest, NextResponse } from "next/server";
import { uploadFile as uploadToLocal, FileStorageError } from "@/lib/file-storage";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760"); // 10MB default

type FileType = "task" | "message";

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload request received');

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ Upload failed: Unauthorized');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.email);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const source = formData.get("source") as string; // 'chat' or 'task'
    const taskId = formData.get("taskId") as string;
    const workspaceId = formData.get("workspaceId") as string;

    console.log('📋 Upload details:', { source, taskId, workspaceId, fileName: file?.name, fileSize: file?.size });

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes` },
        { status: 400 }
      );
    }

    // Determine file type based on source
    const fileType: FileType = source === 'chat' ? 'message' : 'task';

    // Validate file type based on usage
    const allowedTypes = {
      task: ["application/pdf"],
      message: ["application/pdf", "image/jpeg", "image/png", "image/svg+xml"],
    };

    if (!allowedTypes[fileType].includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed for ${fileType}` },
        { status: 400 }
      );
    }

    // Get task number for folder organization
    let taskNumber: string | undefined;

    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { taskNumber: true }
      });
      if (task) {
        taskNumber = task.taskNumber;
      }
    }

    // Upload to local storage with organized folder structure
    console.log('📁 Uploading to local storage with folder:', taskNumber ? `${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')} - ${taskNumber}` : 'date-only folder');

    const localResult = await uploadToLocal(file, fileType, taskNumber);

    const uploadResult = {
      id: localResult.id,
      filePath: localResult.filePath,
      location: `/api/download/${localResult.id}`,
    };

    // If this is a task attachment, save to database
    if (fileType === 'task' && taskId) {
      await prisma.taskAttachment.create({
        data: {
          id: localResult.id,
          taskId,
          fileName: localResult.fileName,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          filePath: localResult.filePath,
        },
      });
    }

    console.log('✅ Upload successful:', {
      id: uploadResult.id,
      filePath: uploadResult.filePath,
      location: uploadResult.location,
    });

    return NextResponse.json({
      data: {
        $id: uploadResult.id,
        id: uploadResult.id,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        filePath: uploadResult.filePath,
        location: uploadResult.location,
        storageType: 'local'
      },
    });
  } catch (error) {
    console.error("❌ File upload error:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof FileStorageError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
