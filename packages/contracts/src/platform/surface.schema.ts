import { z } from "zod";

export const SurfaceIdSchema = z.enum(["platform", "pos", "crm", "shared"]);

export type SurfaceId = z.infer<typeof SurfaceIdSchema>;

export const AllowedSurfacesSchema = z.array(SurfaceIdSchema);

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const POS_SURFACE_ALIASES = new Set(["pos", "restaurant"]);
const CRM_SURFACE_ALIASES = new Set(["crm"]);

export const normalizeSurfaceHostname = (hostname: string | null | undefined): string => {
  if (!hostname) {
    return "";
  }

  const first = hostname.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!first) {
    return "";
  }

  return first.replace(/:\d+$/, "");
};

export const resolveSurface = (hostname: string): SurfaceId => {
  const normalized = normalizeSurfaceHostname(hostname);

  if (!normalized || LOCAL_HOSTS.has(normalized)) {
    return "platform";
  }

  const labels = normalized.split(".").filter(Boolean);
  const firstLabel = labels[0] ?? "";

  if (POS_SURFACE_ALIASES.has(firstLabel)) {
    return "pos";
  }

  if (CRM_SURFACE_ALIASES.has(firstLabel)) {
    return "crm";
  }

  return "platform";
};

export const isSurfaceAllowed = (
  surfaceId: SurfaceId,
  allowedSurfaces?: readonly SurfaceId[] | null
): boolean => {
  if (!allowedSurfaces || allowedSurfaces.length === 0) {
    return true;
  }

  if (allowedSurfaces.includes("shared")) {
    return true;
  }

  return allowedSurfaces.includes(surfaceId);
};
