import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import fs from "node:fs";

const REGION = process.env.DO_SPACES_REGION ?? "sgp1";
const BUCKET = process.env.DO_SPACES_BUCKET ?? "czd-erp";
const ENDPOINT = process.env.DO_SPACES_ENDPOINT ?? `https://${REGION}.digitaloceanspaces.com`;
const CDN = process.env.DO_SPACES_CDN_ENDPOINT ?? `https://${BUCKET}.${REGION}.digitaloceanspaces.com`;

// Determine base URL for locally-served uploads.
// In Replit dev the gateway proxies /api/... → this server, so we use /api/uploads.
// The env var LOCAL_UPLOADS_BASE_URL lets production override this.
const LOCAL_UPLOADS_BASE_URL =
  process.env.LOCAL_UPLOADS_BASE_URL ?? "/api/uploads";

// Absolute path to the uploads directory on disk. Resolved from the process
// working directory (the package root when run via pnpm), NOT from
// import.meta.url — the bundled dist file would resolve to the wrong place.
export const LOCAL_UPLOADS_DIR =
  process.env.LOCAL_UPLOADS_DIR ?? path.resolve(process.cwd(), "public/uploads");

/** Keep only simple, safe extensions; anything odd becomes .bin. */
function safeExt(originalName: string): string {
  const ext = (path.extname(originalName) || ".jpg").toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : ".bin";
}

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
  const key = `${folder}/${uuidv4()}${safeExt(originalName)}`;

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
  const filename = `${uuidv4()}${safeExt(originalName)}`;
  const dir = path.join(LOCAL_UPLOADS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `${LOCAL_UPLOADS_BASE_URL}/${folder}/${filename}`;
}

// Local-disk fallback is only safe on a single-instance dev server.
// Prod runs multiple replicas behind a load balancer — files written to one
// replica's disk 404 on the others and vanish on redeploy. Fail closed: the
// fallback activates only when we KNOW we're in development (the dev workflow
// sets NODE_ENV=development explicitly) or when explicitly overridden.
const LOCAL_FALLBACK_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.LOCAL_UPLOADS_ENABLED === "true";

/**
 * Try Spaces first; fall back to local disk on any error (dev only).
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
    } catch (err) {
      if (!LOCAL_FALLBACK_ENABLED) throw err;
      // Fall through to local storage (dev).
    }
  } else if (!LOCAL_FALLBACK_ENABLED) {
    throw new Error("DO Spaces credentials are not configured");
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
