import type { Request } from "express";
import type { SurfaceId } from "@corely/contracts";
import type { PublicWorkspaceContext } from "../public";
import type { SurfaceResolutionSource } from "./request-surface";

export type ContextSource =
  | "user"
  | "token"
  | "header"
  | "proxy"
  | "header-legacy"
  | "route"
  | "public"
  | "generated"
  | "inferred";

export type RequestContextSourceKey =
  | "requestId"
  | "correlationId"
  | "userId"
  | "tenantId"
  | "workspaceId"
  | "surfaceId"
  | "trustedSurfaceId"
  | "declaredSurfaceId"
  | "activeAppId";

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
  trustedSurfaceId?: SurfaceId | null;
  declaredSurfaceId?: string;
  surfaceResolutionSource: SurfaceResolutionSource;
  surfaceHeaderMismatch: boolean;
  roles?: string[];
  scopes?: string[];
  activeAppId?: string;
  metadata?: Record<string, unknown>;
  sources: Partial<Record<RequestContextSourceKey, ContextSource>>;
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
