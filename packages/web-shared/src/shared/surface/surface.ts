import React from "react";
import { resolveSurface, type SurfaceId } from "@corely/contracts";

const CRM_SURFACE_PREFIXES = ["/crm", "/assistant", "/notifications", "/onboarding"] as const;
const POS_SURFACE_PREFIXES = [
  "/pos",
  "/restaurant",
  "/cash",
  "/cash-registers",
  "/notifications",
  "/onboarding",
] as const;

export const getCurrentSurfaceId = (): SurfaceId => {
  if (typeof window === "undefined") {
    return "platform";
  }

  return resolveSurface(window.location.hostname);
};

export const useSurfaceId = (): SurfaceId => {
  const [surfaceId] = React.useState<SurfaceId>(() => getCurrentSurfaceId());
  return surfaceId;
};

export const getDefaultRouteForSurface = (surfaceId: SurfaceId): string => {
  switch (surfaceId) {
    case "app":
      return "/dashboard";
    case "crm":
      return "/crm";
    case "pos":
      return "/cash/registers";
    default:
      return "/dashboard";
  }
};

const matchesSurfacePrefixes = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const isRouteAllowedForSurface = (surfaceId: SurfaceId, pathname: string): boolean => {
  if (surfaceId === "platform" || surfaceId === "app") {
    return true;
  }

  if (surfaceId === "crm") {
    return matchesSurfacePrefixes(pathname, CRM_SURFACE_PREFIXES);
  }

  if (surfaceId === "pos") {
    return matchesSurfacePrefixes(pathname, POS_SURFACE_PREFIXES);
  }

  return false;
};
