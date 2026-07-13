import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";

const REGION = process.env.DO_SPACES_REGION ?? "blr1";
const BUCKET = process.env.DO_SPACES_BUCKET ?? "czd";
const ENDPOINT = process.env.DO_SPACES_ENDPOINT ?? `https://${REGION}.digitaloceanspaces.com`;
const CDN = process.env.DO_SPACES_CDN_ENDPOINT ?? `https://${BUCKET}.${REGION}.digitaloceanspaces.com`;

export const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY ?? "",
  },
  forcePathStyle: false,
});

export async function uploadToSpaces(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder = "uploads"
): Promise<string> {
  const ext = path.extname(originalName) || ".jpg";
  const key = `${folder}/${uuidv4()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    })
  );

  return `${CDN}/${key}`;
}

export async function deleteFromSpaces(url: string): Promise<void> {
  try {
    const cdnPrefix = `${CDN}/`;
    if (!url.startsWith(cdnPrefix)) return;
    const key = url.slice(cdnPrefix.length);
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
  }
}
