import { z } from "zod";

export const SurfaceIdSchema = z.enum(["platform", "app", "pos", "crm"]);
export const SurfaceTargetIdSchema = z.union([SurfaceIdSchema, z.literal("shared")]);

export type SurfaceId = z.infer<typeof SurfaceIdSchema>;
export type SurfaceTargetId = z.infer<typeof SurfaceTargetIdSchema>;

export const AllowedSurfacesSchema = z.array(SurfaceTargetIdSchema);

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

const matchesSurfaceAlias = (
  surfaceId: SurfaceId,
  allowedSurfaces: readonly SurfaceTargetId[]
): boolean => {
  if (allowedSurfaces.includes(surfaceId)) {
    return true;
  }

  // Preserve compatibility while the platform/app naming is normalized incrementally.
  if (surfaceId === "platform" && allowedSurfaces.includes("app")) {
    return true;
  }

  if (surfaceId === "app" && allowedSurfaces.includes("platform")) {
    return true;
  }

  return false;
};

export const isSurfaceAllowed = (
  surfaceId: SurfaceId,
  allowedSurfaces?: readonly SurfaceTargetId[] | null
): boolean => {
  if (!allowedSurfaces || allowedSurfaces.length === 0) {
    return true;
  }

  if (allowedSurfaces.includes("shared")) {
    return true;
  }

  return matchesSurfaceAlias(surfaceId, allowedSurfaces);
};
