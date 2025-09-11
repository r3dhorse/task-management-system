import { NextRequest, NextResponse } from "next/server";
import { uploadToS3, generateS3Key, S3UploadResult } from "@/lib/s3-client";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760"); // 10MB default

type FileType = "task" | "message";

class FileStorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "FileStorageError";
  }
}

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
    const workspaceId = formData.get("workspaceId") as string;
    
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

    // Get workspace and task name for folder structure
    let workspaceName = "unknown-workspace";
    let taskName: string | undefined;
    
    if (taskId) {
      // Get task and workspace details
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { workspace: { select: { name: true } } }
      });
      if (task) {
        taskName = task.name;
        workspaceName = task.workspace.name;
      }
    } else if (workspaceId) {
      // Get workspace name if task is not provided
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true }
      });
      if (workspace) {
        workspaceName = workspace.name;
      }
    }

    // Generate unique file ID and S3 key
    const fileId = randomUUID();
    const extension = file.name.split('.').pop() || '';
    const fileName = `${fileId}.${extension}`;
    const s3Key = generateS3Key(workspaceName, fileName, taskName);
    
    console.log('Generated S3 key:', {
      s3Key,
      workspaceName,
      taskName,
      fileName,
      fileType,
      source
    });

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file to S3
    console.log('Starting S3 upload for:', file.name);
    const uploadResult: S3UploadResult = await uploadToS3(buffer, s3Key, file.type);
    console.log('S3 upload completed:', uploadResult);

    // If this is a task attachment, save to database
    if (fileType === 'task' && taskId) {
      await prisma.taskAttachment.create({
        data: {
          id: fileId,
          taskId,
          fileName,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          filePath: uploadResult.key, // Store S3 key as filePath
        },
      });
    }

    // For message attachments, return the S3 key as the ID since they're not stored in a separate table
    const responseId = fileType === 'message' ? uploadResult.key : fileId;

    return NextResponse.json({
      data: {
        $id: responseId,
        id: responseId, // Add both formats for compatibility
        name: file.name,
        size: file.size,
        mimeType: file.type,
        s3Key: uploadResult.key,
        location: uploadResult.location,
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