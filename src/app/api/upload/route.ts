import { NextRequest, NextResponse } from "next/server";
import { uploadToS3, generateS3Key, S3UploadResult } from "@/lib/s3-client";
import { uploadFile as uploadToLocal, FileStorageError } from "@/lib/file-storage";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760"); // 10MB default

type FileType = "task" | "message";

// Check if AWS S3 is configured
function isS3Configured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && 
           process.env.AWS_SECRET_ACCESS_KEY && 
           process.env.AWS_REGION);
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

    const useS3 = isS3Configured();
    console.log(`Using ${useS3 ? 'S3' : 'local'} storage for file upload`);

    let uploadResult: {
      id: string;
      filePath: string;
      location: string;
      isS3: boolean;
    };
    let fileId: string = randomUUID();
    
    if (useS3) {
      // S3 Upload Logic
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

      // Generate S3 key
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

      // Convert File to Buffer and upload to S3
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const s3Result: S3UploadResult = await uploadToS3(buffer, s3Key, file.type);
      console.log('S3 upload completed:', s3Result);

      uploadResult = {
        id: fileType === 'message' ? s3Result.key : fileId,
        filePath: s3Result.key,
        location: s3Result.location,
        isS3: true
      };
    } else {
      // Local Storage Upload Logic
      console.log('Starting local file upload for:', file.name);
      const localResult = await uploadToLocal(file, fileType);
      console.log('Local upload completed:', localResult);

      uploadResult = {
        id: localResult.id,
        filePath: localResult.filePath,
        location: `/api/download/${localResult.id}`,
        isS3: false
      };
      fileId = localResult.id;
    }

    // If this is a task attachment, save to database
    if (fileType === 'task' && taskId) {
      await prisma.taskAttachment.create({
        data: {
          id: fileId,
          taskId,
          fileName: uploadResult.isS3 ? `${fileId}.${file.name.split('.').pop() || ''}` : file.name,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          filePath: uploadResult.filePath,
        },
      });
    }

    return NextResponse.json({
      data: {
        $id: uploadResult.id,
        id: uploadResult.id,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        filePath: uploadResult.filePath,
        location: uploadResult.location,
        storageType: uploadResult.isS3 ? 's3' : 'local'
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