import { createHmac, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ServiceUnavailableException } from "@nestjs/common";

export function secret() {
  return randomBytes(32).toString("base64url");
}
function key(id: string) {
  let value: string | undefined;
  try {
    const ring = process.env.SIGN_DELIVERY_KEYS_JSON
      ? (JSON.parse(process.env.SIGN_DELIVERY_KEYS_JSON) as Record<string, string>)
      : null;
    value =
      ring && Object.hasOwn(ring, id)
        ? ring[id]
        : id === "default"
          ? process.env.SIGN_DELIVERY_KEY
          : undefined;
  } catch {
    throw new ServiceUnavailableException("Invalid signing delivery key configuration");
  }
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new ServiceUnavailableException("Signing invitation encryption is unavailable");
  }
  return Buffer.from(value, "hex");
}
export function publicOrigin() {
  const value = process.env.SIGN_PUBLIC_ORIGIN;
  if (!value) {
    throw new ServiceUnavailableException("Configure the public signing origin");
  }
  const url = new URL(value);
  if (
    url.origin !== value ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname) &&
        process.env.NODE_ENV !== "production"
      ))
  ) {
    throw new ServiceUnavailableException("Invalid public signing origin");
  }
  return url.origin;
}
export function sealInvitation(token: string, id: string) {
  const kid = process.env.SIGN_DELIVERY_ACTIVE_KEY ?? "default";
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(kid)) {
    throw new ServiceUnavailableException("Invalid delivery key identifier");
  }
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(kid), iv);
  cipher.setAAD(Buffer.from(id));
  const bytes = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return kid + "." + [iv, cipher.getAuthTag(), bytes].map((b) => b.toString("base64url")).join(".");
}
export function openInvitation(encoded: string, id: string) {
  const parts = encoded.split(".");
  const kid = parts.length === 3 ? "default" : parts.shift();
  const [iv, tag, bytes] = parts.map((b) => Buffer.from(b, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", key(kid), iv);
  cipher.setAAD(Buffer.from(id));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(bytes), cipher.final()]).toString("utf8");
}

function confirmPreview(session: string, review: string, values: unknown) {
  const reviewKey = createHmac("sha256", key(process.env.SIGN_DELIVERY_ACTIVE_KEY ?? "default"))
    .update("corely-sign-review-v1")
    .digest();
  return createHmac("sha256", reviewKey)
    .update(JSON.stringify([session, review, values]))
    .digest("hex");
}

export const invitationSecrets = {
  confirmPreview,
  secret,
  sealInvitation,
  openInvitation,
  publicOrigin,
};
