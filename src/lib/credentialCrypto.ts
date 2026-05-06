import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const CREDENTIAL_PREFIX = "enc:v1";

function deriveKeyFromEnv(): Buffer {
  const rawKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY não configurada.");
  }

  return createHash("sha256").update(rawKey, "utf8").digest();
}

export function encryptCredentialValue(value: string): string {
  if (!value) return "";

  const key = deriveKeyFromEnv();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${CREDENTIAL_PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptCredentialValue(value: string): string {
  if (!value) return "";

  if (!value.startsWith(`${CREDENTIAL_PREFIX}:`)) {
    return value;
  }

  const parts = value.split(":");
  if (parts.length !== 5) {
    throw new Error("Formato de credencial criptografada inválido.");
  }

  const [, version, ivBase64, tagBase64, encryptedBase64] = parts;
  if (version !== "v1") {
    throw new Error("Versão de credencial criptografada não suportada.");
  }

  const key = deriveKeyFromEnv();
  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
