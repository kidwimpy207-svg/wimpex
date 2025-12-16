// S3 service: presigned URLs for direct browser uploads
let S3Client;
let getSignedUrl;
try {
  S3Client = require('@aws-sdk/client-s3').S3Client;
  getSignedUrl = require('@aws-sdk/s3-request-presigner').getSignedUrl;
} catch (err) {
  console.warn('⚠️ AWS SDK not installed; S3 uploads disabled');
}

const { PutObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');
const crypto = require('crypto');

let s3Client = null;

// Initialize S3 client
const initS3 = () => {
  if (!S3Client) {
    console.log('⚠️ AWS SDK not installed; local storage fallback enabled');
    return;
  }

  if (config.aws?.accessKeyId && config.aws?.secretAccessKey && config.aws?.bucket) {
    try {
      s3Client = new S3Client({
        region: config.aws.region || 'us-east-1',
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      });
      console.log('☁️ S3 service initialized');
    } catch (err) {
      console.warn('⚠️ S3 service failed to initialize:', err.message);
    }
  } else {
    console.log('⚠️ S3 not configured; local storage fallback enabled');
  }
};

// Generate presigned upload URL
const getPresignedUploadUrl = async (filename, contentType, expiresIn = 3600) => {
  if (!s3Client || !getSignedUrl) {
    return { success: false, message: 'S3 not configured' };
  }

  try {
    // Sanitize filename and add UUID to prevent collisions
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const key = `uploads/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${sanitized}`;

    const command = new PutObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      success: true,
      presignedUrl,
      key,
      bucket: config.aws.bucket,
    };
  } catch (err) {
    console.error('✗ S3 presigned URL generation failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Construct CDN URL for uploaded file
const getCdnUrl = (key) => {
  const bucket = config.aws?.bucket;
  const region = config.aws?.region || 'us-east-1';
  const cloudfront = config.aws?.cloudfront;

  if (cloudfront) {
    return `${cloudfront}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

initS3();

module.exports = {
  getPresignedUploadUrl,
  getCdnUrl,
};
