import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

import https from "https";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { encryptFileBuffer, decryptFileBuffer, isEncryptedBuffer } from "./crypto";

export { encryptFileBuffer, decryptFileBuffer, isEncryptedBuffer };

let cachedS3Client: S3Client | null = null;

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

export function getS3Client(): S3Client {
  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION || "ap-southeast-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
      requestHandler: new NodeHttpHandler({
        httpsAgent: new https.Agent({
          keepAlive: true,
          maxSockets: 50,
          keepAliveMsecs: 60000,
        }),
      }),
    });
  }
  return cachedS3Client;
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
 * By default, encrypts files with AES-256-GCM Zero-Knowledge encryption
 * before writing to cloud storage, ensuring even Neon and AWS cannot view files.
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
    const s3 = getS3Client();
    const bucket = getStorageBucket();

    // Zero-Knowledge Encryption: Encrypt in-memory before sending to cloud bucket
    const bodyToSend = encrypt ? encryptFileBuffer(fileBuffer) : fileBuffer;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storagePath,
        Body: bodyToSend,
        ContentType: encrypt ? "application/octet-stream" : (mimeType || "application/octet-stream"),
      })
    );

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
    const s3 = getS3Client();
    const bucket = getStorageBucket();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      ResponseContentDisposition: `${disposition}; filename="${safeFileName}"`,
    });

    return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.warn("Error creating signed URL from storage, falling back to stream endpoint:", err);
    return `/api/download?path=${encodeURIComponent(storagePath)}&name=${encodeURIComponent(safeFileName)}${asAttachment ? "&download=1" : "&inline=1"}`;
  }
}

/**
 * Deletes object from Neon Object Storage
 */
export async function deleteFileFromStorage(storagePath: string): Promise<boolean> {
  if (!isS3Configured()) return false;
  try {
    const s3 = getS3Client();
    const bucket = getStorageBucket();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: storagePath,
      })
    );
    return true;
  } catch (err) {
    console.error("Failed to delete object from storage:", err);
    return false;
  }
}

/**
 * Fetches file stream and metadata directly from Neon Object Storage
 */
export async function getFileStreamFromStorage(storagePath: string) {
  if (!isS3Configured()) return null;
  try {
    const s3 = getS3Client();
    const bucket = getStorageBucket();
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: storagePath,
      })
    );
    return res;
  } catch (err) {
    console.warn("Failed to get file stream from storage:", err);
    return null;
  }
}

/**
 * Fetches complete file buffer from storage and decrypts in-memory on the fly.
 * Handles both AES-256-GCM Zero-Knowledge encrypted files and legacy files transparently.
 */
export async function getFileBufferFromStorage(storagePath: string): Promise<Buffer | null> {
  const streamRes = await getFileStreamFromStorage(storagePath);
  if (!streamRes || !streamRes.Body) return null;
  try {
    const bytes = await streamRes.Body.transformToByteArray();
    const rawBuffer = Buffer.from(bytes);
    return decryptFileBuffer(rawBuffer);
  } catch (err) {
    console.warn("Failed to read/decrypt stream to buffer:", err);
    return null;
  }
}

