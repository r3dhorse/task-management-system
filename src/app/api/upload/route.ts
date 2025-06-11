import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite";
import { IMAGES_BUCKET_ID } from "@/config";
import { ID } from "node-appwrite";

export async function POST(request: NextRequest) {
  try {
    const { storage } = await createSessionClient();
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const source = formData.get("source") as string; // 'chat' or 'task'
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Determine file type restrictions and size limits based on source
    const isChat = source === 'chat';
    
    if (isChat) {
      // Chat: Support images and PDFs, max 3MB
      const allowedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/svg+xml',
        'application/pdf'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Only JPG, PNG, SVG and PDF files are allowed" },
          { status: 400 }
        );
      }

      const maxSize = 3 * 1024 * 1024; // 3MB for chat files
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size must be less than 3MB" },
          { status: 400 }
        );
      }
    } else {
      // Task: Only PDFs, max 10MB (existing behavior)
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Only PDF files are allowed" },
          { status: 400 }
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB for task files
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size must be less than 10MB" },
          { status: 400 }
        );
      }
    }

    // Upload to Appwrite Storage
    const uploadedFile = await storage.createFile(
      IMAGES_BUCKET_ID,
      ID.unique(),
      file,
    );

    return NextResponse.json({
      data: uploadedFile,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}