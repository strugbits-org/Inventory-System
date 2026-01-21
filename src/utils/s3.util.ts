import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
) => {
  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read', // Add this line to make the object publicly readable
  });

  await s3Client.send(command);
  return `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};

export const uploadBase64ToS3 = async (base64: string, key: string) => {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    return uploadToS3(buffer, key, contentType);
}

export const uploadMulterFileToS3 = async (
  file: Express.Multer.File,
  key: string
) => {
  return uploadToS3(file.buffer, key, file.mimetype);
};

export const deleteFromS3 = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
};
