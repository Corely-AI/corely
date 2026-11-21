import { createHash } from "node:crypto";
export function hash(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}
