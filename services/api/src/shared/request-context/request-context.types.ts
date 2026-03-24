import type { Request } from "express";
import type { SurfaceId } from "@corely/contracts";
import type { PublicWorkspaceContext } from "../public";

export type ContextSource =
  | "user"
  | "token"
  | "header"
  | "header-legacy"
  | "route"
  | "public"
  | "generated"
  | "inferred";

export interface RequestPrincipal {
  userId: string;
  email?: string;
  tenantId?: string | null;
  workspaceId?: string | null;
  roleIds?: string[];
}

export interface RequestContext {
  requestId: string;
  correlationId?: string;
  userId?: string;
  workspaceId?: string | null;
  tenantId?: string | null;
  surfaceId: SurfaceId;
  roles?: string[];
  scopes?: string[];
  activeAppId?: string;
  metadata?: Record<string, unknown>;
  sources: Partial<Record<keyof Omit<RequestContext, "metadata" | "sources">, ContextSource>>;
  deprecated?: {
    workspaceHeaderUsed?: boolean;
    tenantHeaderUsed?: boolean;
    userHeaderUsed?: boolean;
  };
}

export type ContextAwareRequest = Request & {
  context?: RequestContext;
  user?: RequestPrincipal;
  tenantId?: string | null;
  workspaceId?: string | null;
  roleIds?: string[];
  surfaceId?: SurfaceId;
  traceId?: string;
  activeAppId?: string;
  id?: string;
  publicContext?: PublicWorkspaceContext;
};
