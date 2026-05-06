import "server-only";
import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const rawKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY nao configurada");
  }

  return crypto.createHash("sha256").update(rawKey, "utf8").digest();
}

export function isEncryptedCredential(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptCredentialIfNeeded(value: string): string {
  if (!value || isEncryptedCredential(value)) {
    return value;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptCredentialIfNeeded(value: string): string {
  if (!value || !isEncryptedCredential(value)) {
    return value;
  }

  const raw = value.slice(ENCRYPTION_PREFIX.length);
  const [ivBase64, authTagBase64, encryptedBase64] = raw.split(":");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Formato de credencial criptografada invalido");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
