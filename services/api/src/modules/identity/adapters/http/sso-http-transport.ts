import type { INestApplication } from "@nestjs/common";
import { json, urlencoded, type Request, type Response, type NextFunction } from "express";
import { isSsoRoute } from "./sso-http-security";

/** Install before the legacy body parsers. Keep credentialed legacy CORS off SSO. */
export function configureSsoHttpTransport(app: INestApplication) {
  const parseJson = json({ limit: "4kb" });
  const parseForm = urlencoded({ limit: "4kb", extended: false });
  app.use((req: Request, res: Response, next: NextFunction) => {
    // The global public-workspace middleware otherwise rewrites /w/:slug/* and
    // logs the original URL. SSO has exact paths, never workspace aliases.
    const unwrapped = req.path.replace(/^\/w\/[^/]+(?=\/)/i, "");
    if (unwrapped !== req.path && isSsoRoute(unwrapped)) {
      res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
      res.status(404).end();
      return;
    }
    if (!isSsoRoute(req.path)) {
      return next();
    }
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    parseJson(req, res, (error) => {
      if (error) {
        return res.status(400).json({ message: "Invalid or oversized sign-in request" });
      }
      parseForm(req, res, (formError) => {
        if (formError) {
          return res.status(400).json({ message: "Invalid or oversized sign-in request" });
        }
        next();
      });
    });
  });
  app.enableCors((req: Request, callback) => {
    const sso = isSsoRoute(req.path);
    callback(null, { origin: !sso, credentials: !sso });
  });
}
