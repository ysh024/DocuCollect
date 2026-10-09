import crypto from "crypto";

/**
 * Generates a cryptographically secure random token for client upload links.
 * Returns both the raw plaintext token (to show/send to client) and the SHA-256 hash (to store in DB).
 */
export function generateUploadToken(): {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const token = crypto.randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const tokenPrefix = token.substring(0, 6);

  return {
    token,
    tokenHash,
    tokenPrefix,
  };
}

/**
 * Computes SHA-256 hash of a plaintext token for secure database lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
