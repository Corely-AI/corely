import React from "react";
import type { WorkspaceCapabilityKey } from "@corely/contracts";
import NotFound from "@corely/web-shared/shared/components/NotFound";
import { PageLoadingSkeleton } from "../components/page-loading-skeleton";
import { useWorkspaceConfig } from "./workspace-config-provider";

interface RequireCapabilityProps {
  capability: WorkspaceCapabilityKey;
  children: React.ReactNode;
}

export const RequireCapability: React.FC<RequireCapabilityProps> = ({ capability, children }) => {
  const { isLoading, hasCapability } = useWorkspaceConfig();

  if (isLoading) {
    return <PageLoadingSkeleton />;
  }

  if (!hasCapability(capability)) {
    return <NotFound />;
  }

  return <>{children}</>;
};
