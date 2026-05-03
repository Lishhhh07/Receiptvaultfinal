import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config";
import { logger } from "../utils/logger";
import { UploadError } from "../utils/errors";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

function mimeTypeToExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadToR2(
  imageBuffer: Buffer,
  phone: string,
  mimeType: string
): Promise<string> {
  const ext = mimeTypeToExtension(mimeType);
  const filename = `receipts/${phone}/${Date.now()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: filename,
    Body: imageBuffer,
    ContentType: mimeType,
  });

  try {
    await s3Client.send(command);
  } catch (firstErr) {
    logger.warn({ filename, err: firstErr }, "R2 upload failed, retrying in 1s");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      await s3Client.send(command);
    } catch (retryErr) {
      logger.error({ filename, err: retryErr }, "R2 upload retry failed");
      throw new UploadError(`Failed to upload ${filename} to R2`);
    }
  }

  const publicUrl = `${config.r2.publicUrl}/${filename}`;
  logger.info({ filename, publicUrl }, "Image uploaded to R2");
  return publicUrl;
}
