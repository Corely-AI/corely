import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import type { SsoCryptoPort } from "../../application/ports/sso-crypto.port";

export function ssoSecret(): string {
  return randomBytes(32).toString("base64url");
}
export function ssoHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
export function ssoChallenge(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}
export function ssoEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export class SsoCrypto implements SsoCryptoPort {
  private readonly key: Buffer;
  secret = ssoSecret;
  emailCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");
  hash = ssoHash;
  challenge = ssoChallenge;
  equal = ssoEqual;
  constructor(secret: string) {
    this.key = Buffer.from(secret, "hex");
  }
  csrf(handle: string, binding: string): string {
    return createHmac("sha256", this.key)
      .update(JSON.stringify([handle, binding]))
      .digest("base64url");
  }
  encrypt(value: string, binding: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(binding));
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
  }
  decrypt(value: string, binding: string): string {
    const data = Buffer.from(value, "base64url");
    const cipher = createDecipheriv("aes-256-gcm", this.key, data.subarray(0, 12));
    cipher.setAAD(Buffer.from(binding));
    cipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8");
  }
}
