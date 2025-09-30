import { NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test S3 configuration
    const config = {
      hasAccessKey: !!(process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID),
      hasSecretKey: !!(process.env.AWS_SECRET_ACCESS_KEY || process.env.BUCKET_SECRET_ACCESS_KEY),
      hasRegion: !!(process.env.AWS_REGION || process.env.BUCKET_REGION),
      region: process.env.AWS_REGION || process.env.BUCKET_REGION,
      bucket: process.env.AWS_S3_BUCKET_NAME || process.env.BUCKET_NAME,
      accessKeyPrefix: (process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID || '').substring(0, 8),
    };

    console.log('Testing S3 configuration:', config);

    // Try a test upload
    const testBuffer = Buffer.from('test file content');
    const testKey = `test-uploads/test-${Date.now()}.txt`;

    const result = await uploadToS3(testBuffer, testKey, 'text/plain');

    return NextResponse.json({
      success: true,
      message: 'S3 upload test successful!',
      config,
      uploadResult: result,
    });

  } catch (error) {
    console.error('S3 test failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      config: {
        hasAccessKey: !!(process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID),
        hasSecretKey: !!(process.env.AWS_SECRET_ACCESS_KEY || process.env.BUCKET_SECRET_ACCESS_KEY),
        hasRegion: !!(process.env.AWS_REGION || process.env.BUCKET_REGION),
        region: process.env.AWS_REGION || process.env.BUCKET_REGION,
        bucket: process.env.AWS_S3_BUCKET_NAME || process.env.BUCKET_NAME,
        accessKeyPrefix: (process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID || '').substring(0, 8),
      }
    }, { status: 500 });
  }
}