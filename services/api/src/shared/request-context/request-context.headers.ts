import { z } from "zod";

export const HEADER_REQUEST_ID = "x-request-id";
export const HEADER_TRACE_ID = "x-trace-id";
export const HEADER_CORRELATION_ID = "x-correlation-id";
export const HEADER_TENANT_ID = "x-tenant-id";
export const HEADER_WORKSPACE_ID = "x-workspace-id";

export const tenantHeaderSchema = z.string().trim().min(1);
export const workspaceHeaderSchema = z.string().trim().min(1);
export const requestIdHeaderSchema = z.string().trim().min(1);
