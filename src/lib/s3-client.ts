import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Get S3 configuration from environment
const S3_REGION = process.env.AWS_REGION || process.env.BUCKET_REGION || 'ap-southeast-2';
const S3_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID || '';
const S3_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || process.env.BUCKET_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.BUCKET_NAME || 'task-management-system-2025';

console.log('🔧 S3 Client Configuration:', {
  region: S3_REGION,
  bucket: BUCKET_NAME,
  hasAccessKey: !!S3_ACCESS_KEY,
  hasSecretKey: !!S3_SECRET_KEY,
  accessKeyPrefix: S3_ACCESS_KEY.substring(0, 8),
});

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: false, // Use virtual-hosted-style URLs (default)
  useAccelerateEndpoint: false,
});

export interface S3UploadResult {
  key: string;
  location: string;
  bucket: string;
}

export function generateS3Key(workspaceName: string, fileName: string, taskName?: string): string {
  const timestamp = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // dd-mm-yyyy format
  const sanitizedWorkspaceName = workspaceName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-_]/g, '-');
  
  // If task name is provided, use TaskName_WorkspaceName_Timestamp format
  if (taskName) {
    const sanitizedTaskName = taskName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    return `task-management-system-2025/${sanitizedTaskName}_${sanitizedWorkspaceName}_${timestamp}/${sanitizedFileName}`;
  }
  
  // Fallback to workspace-timestamp format
  return `task-management-system-2025/${sanitizedWorkspaceName}_${timestamp}/${sanitizedFileName}`;
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<S3UploadResult> {
  try {
    console.log('🚀 Starting S3 upload:', {
      key,
      contentType,
      bufferSize: buffer.length,
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION || process.env.BUCKET_REGION,
    });

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      },
    });

    const result = await upload.done();

    console.log('✅ S3 upload successful:', {
      key,
      location: result.Location,
    });

    return {
      key,
      location: result.Location || `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || process.env.BUCKET_REGION}.amazonaws.com/${key}`,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    console.error('❌ Error uploading to S3:', error);
    console.error('S3 Configuration:', {
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION || process.env.BUCKET_REGION,
      hasAccessKey: !!(process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID),
      hasSecretKey: !!(process.env.AWS_SECRET_ACCESS_KEY || process.env.BUCKET_SECRET_ACCESS_KEY),
      accessKeyPrefix: (process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID || '').substring(0, 8),
    });
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error; // Throw original error for better debugging
  }
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate download URL');
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw new Error('Failed to delete file from S3');
  }
}

export async function getObjectFromS3(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    // Convert the body to a buffer
    const streamToBuffer = async (stream: ReadableStream | NodeJS.ReadableStream | Blob | Uint8Array | undefined): Promise<Buffer> => {
      if (!stream) {
        throw new Error('No stream to convert');
      }
      
      if (stream instanceof Uint8Array) {
        return Buffer.from(stream);
      }
      
      if (stream instanceof Blob) {
        const arrayBuffer = await stream.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      
      // Handle Node.js Readable Stream
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream as NodeJS.ReadableStream) {
        chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    };
    
    return await streamToBuffer(response.Body);
  } catch (error) {
    console.error('Error getting object from S3:', error);
    throw new Error('Failed to get file from S3');
  }
}

export { s3Client };