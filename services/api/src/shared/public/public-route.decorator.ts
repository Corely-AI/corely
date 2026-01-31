import { SetMetadata } from "@nestjs/common";

export const PUBLIC_WORKSPACE_ROUTE_KEY = "publicWorkspaceRoute";

export const PublicWorkspaceRoute = () => SetMetadata(PUBLIC_WORKSPACE_ROUTE_KEY, true);
