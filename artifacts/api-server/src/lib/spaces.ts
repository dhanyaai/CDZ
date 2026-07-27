import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const REGION = process.env.DO_SPACES_REGION ?? "blr1";
const BUCKET = process.env.DO_SPACES_BUCKET ?? "czd";
const ENDPOINT = process.env.DO_SPACES_ENDPOINT ?? `https://${REGION}.digitaloceanspaces.com`;
const CDN = process.env.DO_SPACES_CDN_ENDPOINT ?? `https://${BUCKET}.${REGION}.digitaloceanspaces.com`;

// Determine base URL for locally-served uploads.
// In Replit dev the gateway proxies /api/... → this server, so we use /api/uploads.
// The env var LOCAL_UPLOADS_BASE_URL lets production override this.
const LOCAL_UPLOADS_BASE_URL =
  process.env.LOCAL_UPLOADS_BASE_URL ?? "/api/uploads";

// Absolute path to the uploads directory on disk.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_UPLOADS_DIR = path.resolve(__dirname, "../../public/uploads");

export const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY ?? "",
  },
  forcePathStyle: false,
});

/** Upload to DigitalOcean Spaces (S3). Throws on failure. */
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

/** Save to local disk and return a URL served by the API static route. */
export async function uploadLocal(
  buffer: Buffer,
  originalName: string,
  folder = "uploads"
): Promise<string> {
  const ext = path.extname(originalName) || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const dir = path.join(LOCAL_UPLOADS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `${LOCAL_UPLOADS_BASE_URL}/${folder}/${filename}`;
}

/**
 * Try Spaces first; fall back to local disk on any error.
 * Returns the public URL of the stored file.
 */
export async function upload(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder = "uploads"
): Promise<string> {
  // Skip S3 entirely if credentials are obviously not configured.
  const hasCredentials =
    (process.env.DO_SPACES_ACCESS_KEY_ID ?? "").length > 0 &&
    (process.env.DO_SPACES_SECRET_KEY ?? "").length > 0;

  if (hasCredentials) {
    try {
      return await uploadToSpaces(buffer, originalName, mimeType, folder);
    } catch {
      // Fall through to local storage.
    }
  }

  return uploadLocal(buffer, originalName, folder);
}

export async function deleteFromSpaces(url: string): Promise<void> {
  try {
    const cdnPrefix = `${CDN}/`;
    if (!url.startsWith(cdnPrefix)) return;
    const key = url.slice(cdnPrefix.length);
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // Best-effort deletion — ignore errors.
  }
}
