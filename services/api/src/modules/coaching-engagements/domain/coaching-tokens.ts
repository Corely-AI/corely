import { createHash, randomBytes } from "node:crypto";

export const createCoachingAccessToken = () => randomBytes(24).toString("base64url");

export const hashCoachingAccessToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
