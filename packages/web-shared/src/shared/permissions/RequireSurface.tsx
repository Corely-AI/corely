import React from "react";
import { isSurfaceAllowed, type SurfaceId } from "@corely/contracts";
import NotFound from "../components/NotFound";
import { useSurfaceId } from "../surface";

interface RequireSurfaceProps {
  surfaces: readonly SurfaceId[];
  children: React.ReactNode;
}

export const RequireSurface: React.FC<RequireSurfaceProps> = ({ surfaces, children }) => {
  const surfaceId = useSurfaceId();

  if (!isSurfaceAllowed(surfaceId, surfaces)) {
    return <NotFound />;
  }

  return <>{children}</>;
};
