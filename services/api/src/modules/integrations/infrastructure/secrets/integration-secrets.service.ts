import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { ValidationError } from "@corely/kernel";

@Injectable()
export class IntegrationSecretsService {
  constructor(private readonly env: EnvService) {}

  encrypt(plainText: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
  }

  decrypt(cipherText: string): string {
    const key = this.getKey();
    const [ivB64, tagB64, payloadB64] = cipherText.split(".");
    if (!ivB64 || !tagB64 || !payloadB64) {
      throw new ValidationError("Invalid encrypted secret payload");
    }

    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadB64, "base64url")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }

  private getKey(): Buffer {
    const material = this.env.INTEGRATIONS_SECRET_KEY ?? this.env.JWT_SECRET;
    if (!material) {
      throw new ValidationError("INTEGRATIONS_SECRET_KEY or JWT_SECRET must be configured");
    }
    return createHash("sha256").update(material).digest();
  }
}
