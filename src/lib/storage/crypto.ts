import crypto from "crypto";

// Magic header bytes (8 bytes) to identify encrypted files and versioning
const MAGIC_HEADER = Buffer.from("DOCUENC1", "utf-8");
const IV_LENGTH = 12; // 12 bytes standard IV for AES-GCM
const TAG_LENGTH = 16; // 16 bytes authentication tag for AES-GCM

/**
 * Resolves a 32-byte cryptographic key for AES-256-GCM.
 * Held strictly in the application runtime — NEVER exposed to or shared with Neon or AWS.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.STORAGE_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (envKey) {
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, "hex");
    }
    // If arbitrary string, derive 32-byte key via SHA-256
    return crypto.createHash("sha256").update(envKey).digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: STORAGE_ENCRYPTION_KEY or AUTH_SECRET must be configured in production environment.");
  }
  console.warn("WARNING: Using development fallback key for file encryption. Set STORAGE_ENCRYPTION_KEY in production.");
  const devFallback = process.env.DATABASE_URL || "docucollect_dev_only_key_not_for_production";
  return crypto.createHash("sha256").update(devFallback).digest();
}

/**
 * Checks if a buffer starts with our encryption signature (DOCUENC1)
 */
export function isEncryptedBuffer(buffer: Buffer | Uint8Array): boolean {
  if (!buffer || buffer.length < MAGIC_HEADER.length + IV_LENGTH + TAG_LENGTH) {
    return false;
  }
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return buf.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER);
}

/**
 * Encrypts a raw file buffer using military-grade AES-256-GCM before uploading to cloud storage.
 * Output format: [DOCUENC1 (8B)] + [IV (12B)] + [AuthTag (16B)] + [Ciphertext]
 */
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

/**
 * Decrypts a file buffer in-memory if it was encrypted with AES-256-GCM.
 * If the buffer is unencrypted (legacy upload), it returns the buffer unchanged for full backward compatibility.
 */
export function decryptFileBuffer(fileBuffer: Buffer | Uint8Array): Buffer {
  if (!isEncryptedBuffer(fileBuffer)) {
    // Unencrypted legacy file - return as is for backward compatibility
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

    // Alternative 1: AUTH_SECRET derived key
    if (process.env.AUTH_SECRET) {
      try {
        const altKey = crypto.createHash("sha256").update(process.env.AUTH_SECRET).digest();
        const altDecipher = crypto.createDecipheriv("aes-256-gcm", altKey, iv);
        altDecipher.setAuthTag(authTag);
        return Buffer.concat([altDecipher.update(ciphertext), altDecipher.final()]);
      } catch {}
    }

    // Alternative 2: DATABASE_URL derived key
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
