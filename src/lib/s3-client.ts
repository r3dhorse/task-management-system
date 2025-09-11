import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'task-management-system-2025';

console.log('S3 Client initialized with:', {
  region: process.env.AWS_REGION || 'ap-southeast-2',
  bucket: BUCKET_NAME,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyLength: process.env.AWS_ACCESS_KEY_ID?.length || 0
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
    console.log('Uploading to S3 with:', {
      bucket: BUCKET_NAME,
      key,
      contentType,
      bufferSize: buffer.length,
      region: process.env.AWS_REGION
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
    
    console.log('S3 upload successful:', {
      key,
      location: result.Location,
      etag: result.ETag
    });
    
    return {
      key,
      location: result.Location || `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    console.error('S3 Configuration:', {
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });
    throw new Error('Failed to upload file to S3');
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

    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error getting object from S3:', error);
    throw new Error('Failed to get file from S3');
  }
}

export { s3Client };