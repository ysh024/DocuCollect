import crypto from "crypto";
import { AwsClient } from "aws4fetch";

// =====================================================================
// APPLICATION-LAYER AES-256-GCM IN-MEMORY STORAGE ENCRYPTION
// =====================================================================

const MAGIC_HEADER = Buffer.from("DOCUENC1", "utf-8");
const IV_LENGTH = 12; // 12 bytes standard IV for AES-GCM
const TAG_LENGTH = 16; // 16 bytes authentication tag for AES-GCM

function getEncryptionKey(): Buffer {
  const envKey = process.env.STORAGE_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (envKey) {
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, "hex");
    }
    return crypto.createHash("sha256").update(envKey).digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: STORAGE_ENCRYPTION_KEY or AUTH_SECRET must be configured in production environment.");
  }
  const devFallback = process.env.DATABASE_URL || "docucollect_dev_only_key_not_for_production";
  return crypto.createHash("sha256").update(devFallback).digest();
}

export function isEncryptedBuffer(buffer: Buffer | Uint8Array): boolean {
  if (!buffer || buffer.length < MAGIC_HEADER.length + IV_LENGTH + TAG_LENGTH) {
    return false;
  }
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return buf.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER);
}

export function encryptFileBuffer(rawBuffer: Buffer | Uint8Array): Buffer {
  if (isEncryptedBuffer(rawBuffer)) {
    return Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer);
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const inputBuf = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer);
  const encrypted = Buffer.concat([cipher.update(inputBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([MAGIC_HEADER, iv, authTag, encrypted]);
}

export function decryptFileBuffer(fileBuffer: Buffer | Uint8Array): Buffer {
  if (!isEncryptedBuffer(fileBuffer)) {
    return Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
  }

  const buf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
  const key = getEncryptionKey();

  let offset = MAGIC_HEADER.length;
  const iv = buf.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const authTag = buf.subarray(offset, offset + TAG_LENGTH);
  offset += TAG_LENGTH;
  const ciphertext = buf.subarray(offset);

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (decErr: any) {
    console.warn("Primary key decryption failed, attempting alternative key fallbacks:", decErr?.message);

    if (process.env.AUTH_SECRET) {
      try {
        const altKey = crypto.createHash("sha256").update(process.env.AUTH_SECRET).digest();
        const altDecipher = crypto.createDecipheriv("aes-256-gcm", altKey, iv);
        altDecipher.setAuthTag(authTag);
        return Buffer.concat([altDecipher.update(ciphertext), altDecipher.final()]);
      } catch {}
    }

    if (process.env.DATABASE_URL) {
      try {
        const dbKey = crypto.createHash("sha256").update(process.env.DATABASE_URL).digest();
        const dbDecipher = crypto.createDecipheriv("aes-256-gcm", dbKey, iv);
        dbDecipher.setAuthTag(authTag);
        return Buffer.concat([dbDecipher.update(ciphertext), dbDecipher.final()]);
      } catch {}
    }

    throw decErr;
  }
}

// =====================================================================
// OBJECT STORAGE CLIENT & HELPERS
// =====================================================================

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
