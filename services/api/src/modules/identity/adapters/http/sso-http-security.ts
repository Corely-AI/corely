import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { SsoRegistrationService } from "../../application/services/sso-registration.service";
import { SSO_CRYPTO, type SsoCryptoPort } from "../../application/ports/sso-crypto.port";

export const SSO_COOKIES = {
  preauth: "__Host-corely-preauth",
  loginPreauth: "__Host-corely-login-tx",
  central: "__Host-corely-login",
  app: "__Host-corely-session",
} as const;

export function isSsoRoute(path: string): boolean {
  return /^\/(?:sso(?:\/|$)|api\/(?:session|bff)(?:\/|$)|auth\/(?:callback|logged-out)(?:\/|$))/i.test(
    path
  );
}

@Injectable()
export class SsoHttpSecurity {
  constructor(
    private readonly registrations: SsoRegistrationService,
    @Inject(SSO_CRYPTO) private readonly crypto: SsoCryptoPort
  ) {}
  origin(req: Request, central = false): string {
    this.registrations.assertEnabled();
    const allowed = central
      ? [this.registrations.loginOrigin]
      : this.registrations.apps.map((a) => a.origin);
    const forwarded = req.headers["x-corely-sso-origin"];
    let origin: string | undefined;
    if (forwarded !== undefined) {
      const key = req.headers["x-corely-sso-proxy-key"];
      if (
        typeof forwarded !== "string" ||
        typeof key !== "string" ||
        !this.registrations.proxyKey ||
        !this.crypto.equal(key, this.registrations.proxyKey)
      ) {
        throw new UnauthorizedException("Untrusted SSO ingress");
      }
      origin = allowed.find((o) => o === forwarded);
    } else {
      // Never consume X-Forwarded-Host/proto. Direct access requires actual TLS.
      if (!("encrypted" in req.socket) || !req.socket.encrypted) {
        throw new UnauthorizedException("HTTPS required");
      }
      origin = allowed.find((o) => new URL(o).host === req.headers.host);
    }
    if (!origin) {
      throw new UnauthorizedException("Unregistered SSO origin");
    }
    return origin;
  }
  appKey(origin: string) {
    return this.registrations.app(origin).key;
  }
  mutation(req: Request, central = false) {
    const origin = this.origin(req, central);
    if (req.headers.origin !== origin) {
      throw new UnauthorizedException("Unapproved request origin");
    }
    return origin;
  }
  cookie(req: Request, name: string): string | undefined {
    const matches = (req.headers.cookie ?? "")
      .split(";")
      .map((v) => v.trim())
      .filter((v) => v.startsWith(`${name}=`));
    if (matches.length > 1) {
      throw new UnauthorizedException("Ambiguous session cookie");
    }
    const value = matches[0]?.slice(name.length + 1);
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
  }
  setCookie(res: Response, name: string, value: string, maxAge: number) {
    res.cookie(name, value, { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge });
  }
  headers(res: Response) {
    res.set({
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
  }
}
