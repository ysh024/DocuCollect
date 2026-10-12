import { AwsClient } from "aws4fetch";
import { encryptFileBuffer, decryptFileBuffer, isEncryptedBuffer } from "./crypto";

export { encryptFileBuffer, decryptFileBuffer, isEncryptedBuffer };

export interface StorageUploadOptions {
  organizationId: string;
  clientId: string;
  caseId: string;
  requirementId: string;
  version: number;
  fileName: string;
  fileBuffer?: Buffer | Uint8Array;
  mimeType: string;
}

let cachedAwsClient: AwsClient | null = null;

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

export function getStorageBucket(): string {
  return process.env.AWS_S3_BUCKET || "first-bucket";
}

export function getAwsClient(): AwsClient {
  if (!cachedAwsClient) {
    cachedAwsClient = new AwsClient({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      region: process.env.AWS_REGION || "ap-southeast-1",
      service: "s3",
    });
  }
  return cachedAwsClient;
}

export function getS3ObjectUrl(storagePath: string): string {
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || "").replace(/\/+$/, "");
  const bucket = getStorageBucket();
  const cleanKey = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;
  return `${endpoint}/${bucket}/${cleanKey}`;
}

export function generateStoragePath(opts: StorageUploadOptions): string {
  const sanitizedName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const orgClean = opts.organizationId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const clientClean = opts.clientId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const caseClean = opts.caseId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const reqClean = opts.requirementId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `org-${orgClean}/${clientClean}/${caseClean}/${reqClean}/v${opts.version}_${sanitizedName}`;
}

/**
 * Uploads file buffer directly to Neon Object Storage (S3-compatible).
 * Uses fetch-native aws4fetch (zero Node.js fs dependencies, fully compatible with Cloudflare Workers).
 * By default, encrypts files with AES-256-GCM Zero-Knowledge encryption before writing to cloud storage.
 */
export async function uploadFileToStorage({
  storagePath,
  fileBuffer,
  mimeType,
  encrypt = true,
}: {
  storagePath: string;
  fileBuffer: Buffer | Uint8Array;
  mimeType: string;
  encrypt?: boolean;
}): Promise<{ success: boolean; storagePath: string; error?: string }> {
  try {
    const aws = getAwsClient();
    const url = getS3ObjectUrl(storagePath);

    // Zero-Knowledge Encryption: Encrypt in-memory before sending to cloud bucket
    const bodyToSend = encrypt ? encryptFileBuffer(fileBuffer) : fileBuffer;

    const res = await aws.fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": encrypt ? "application/octet-stream" : (mimeType || "application/octet-stream"),
      },
      body: bodyToSend as unknown as BodyInit,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { success: false, storagePath, error: `S3 upload failed (${res.status}): ${errText}` };
    }

    return { success: true, storagePath };
  } catch (err: any) {
    console.error("Neon Object Storage Upload Error:", err);
    return { success: false, storagePath, error: err.message || "Failed to upload to storage" };
  }
}

/**
 * Generates a presigned GET URL for secure direct client downloading from Neon Object Storage
 */
export async function getSignedStorageDownloadUrl(
  storagePath: string,
  fileName?: string,
  expiresInSeconds: number = 3600,
  asAttachment: boolean = true
): Promise<string> {
  const safeFileName = (fileName || "document.pdf").replace(/["\r\n]/g, "");
  const disposition = asAttachment ? "attachment" : "inline";

  if (!isS3Configured()) {
    return `/api/download?path=${encodeURIComponent(storagePath)}&name=${encodeURIComponent(safeFileName)}${asAttachment ? "&download=1" : "&inline=1"}`;
  }

  try {
    const aws = getAwsClient();
    const url = getS3ObjectUrl(storagePath);
    const queryUrl = `${url}?X-Amz-Expires=${expiresInSeconds}&response-content-disposition=${encodeURIComponent(
      `${disposition}; filename="${safeFileName}"`
    )}`;

    const signedReq = await aws.sign(new Request(queryUrl, { method: "GET" }), {
      aws: { signQuery: true },
    });

    return signedReq.url;
  } catch (err) {
    console.warn("Signed URL generation fallback error:", err);
    return `/api/download?path=${encodeURIComponent(storagePath)}&name=${encodeURIComponent(safeFileName)}${asAttachment ? "&download=1" : "&inline=1"}`;
  }
}

/**
 * Deletes object from Neon Object Storage
 */
export async function deleteFileFromStorage(storagePath: string): Promise<boolean> {
  if (!isS3Configured()) return false;
  try {
    const aws = getAwsClient();
    const url = getS3ObjectUrl(storagePath);
    const res = await aws.fetch(url, { method: "DELETE" });
    return res.ok;
  } catch (err) {
    console.error("Failed to delete object from storage:", err);
    return false;
  }
}

/**
 * Fetches complete file buffer from storage and decrypts in-memory on the fly.
 * Handles both AES-256-GCM Zero-Knowledge encrypted files and legacy files transparently.
 */
export async function getFileBufferFromStorage(storagePath: string): Promise<Buffer | null> {
  if (!isS3Configured()) return null;
  try {
    const aws = getAwsClient();
    const url = getS3ObjectUrl(storagePath);
    const res = await aws.fetch(url, { method: "GET" });
    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`S3 fetch returned status ${res.status} for ${storagePath}`);
      return null;
    }

    // Protect Cloudflare Workers 128 MB RAM limit against out-of-memory crashes
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 12 * 1024 * 1024) {
      console.warn(`File "${storagePath}" exceeds 12MB (${contentLength} bytes) in Worker memory, delegating to direct presigned storage URL.`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);
    return decryptFileBuffer(rawBuffer);
  } catch (err: any) {
    console.warn(`Failed to read/decrypt stream to buffer for "${storagePath}":`, err?.message || err);
    return null;
  }
}

/**
 * Legacy compatibility stubs
 */
export function getS3Client(): any {
  return getAwsClient();
}

export async function getFileStreamFromStorage(storagePath: string) {
  if (!isS3Configured()) return null;
  try {
    const aws = getAwsClient();
    const url = getS3ObjectUrl(storagePath);
    const res = await aws.fetch(url, { method: "GET" });
    if (!res.ok) return null;
    return {
      Body: res.body,
      ContentType: res.headers.get("content-type"),
      ContentLength: Number(res.headers.get("content-length") || 0),
    };
  } catch {
    return null;
  }
}
