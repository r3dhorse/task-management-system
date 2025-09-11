import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export interface S3UploadResult {
  key: string;
  location: string;
  bucket: string;
}

export function generateS3Key(workspaceName: string, fileName: string): string {
  const timestamp = new Date().toLocaleDateString('en-GB'); // dd/mm/yyyy format
  const sanitizedWorkspaceName = workspaceName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-_]/g, '-');
  
  return `task-management-system-2025/${sanitizedWorkspaceName}-${timestamp}/${sanitizedFileName}`;
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<S3UploadResult> {
  try {
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
    
    return {
      key,
      location: result.Location || `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
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