import { Injectable } from "@nestjs/common";
import jwt, { type Secret } from "jsonwebtoken";

export type CmsReaderTokenPayload = {
  readerId: string;
  tenantId: string;
  workspaceId: string;
  email: string;
  displayName?: string | null;
};

@Injectable()
export class CmsReaderTokenService {
  private readonly secret: Secret =
    process.env.CMS_READER_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    "cms-reader-secret-change-in-production";
  private readonly expiresIn: string | number = process.env.CMS_READER_JWT_EXPIRES_IN || "7d";

  generateAccessToken(payload: CmsReaderTokenPayload): string {
    return jwt.sign(
      {
        readerId: payload.readerId,
        tenantId: payload.tenantId,
        workspaceId: payload.workspaceId,
        email: payload.email,
        displayName: payload.displayName ?? null,
        type: "cms_reader",
      },
      this.secret,
      {
        expiresIn: this.expiresIn,
        audience: "cms-reader",
      }
    );
  }

  verifyAccessToken(token: string): (CmsReaderTokenPayload & { iat: number; exp: number }) | null {
    try {
      const decoded = jwt.verify(token, this.secret, { audience: "cms-reader" }) as {
        readerId: string;
        tenantId: string;
        workspaceId: string;
        email: string;
        displayName?: string | null;
        type?: string;
        iat: number;
        exp: number;
      };

      if (decoded.type !== "cms_reader") {
        return null;
      }

      return {
        readerId: decoded.readerId,
        tenantId: decoded.tenantId,
        workspaceId: decoded.workspaceId,
        email: decoded.email,
        displayName: decoded.displayName ?? null,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch {
      return null;
    }
  }
}
