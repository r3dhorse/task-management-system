import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite";
import { IMAGES_BUCKET_ID } from "@/config";

interface RouteProps {
  params: {
    fileId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const { storage } = await createSessionClient();
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Get file info to determine content type
    const fileInfo = await storage.getFile(IMAGES_BUCKET_ID, fileId);
    
    // Get file from Appwrite Storage
    const file = await storage.getFileDownload(IMAGES_BUCKET_ID, fileId);

    // Determine content type based on file extension or mime type
    const getContentType = (fileName: string, mimeType?: string) => {
      if (mimeType) {
        return mimeType;
      }
      
      const extension = fileName.toLowerCase().split('.').pop();
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg';
        case 'png':
          return 'image/png';
        case 'svg':
          return 'image/svg+xml';
        case 'pdf':
          return 'application/pdf';
        default:
          return 'application/octet-stream';
      }
    };

    const contentType = getContentType(fileInfo.name, fileInfo.mimeType);
    
    // For images, use inline disposition to allow viewing in browser
    // For PDFs and other files, use attachment to force download
    const isImage = contentType.startsWith('image/');
    const disposition = isImage 
      ? `inline; filename="${fileInfo.name}"`
      : `attachment; filename="${fileInfo.name}"`;

    // Return the file as a response with proper headers
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
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