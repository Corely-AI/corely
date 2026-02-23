import { Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { NotFoundError } from "@corely/kernel";
import { DIRECTORY_ERROR_CODES } from "@corely/contracts";
import type { DirectoryScope } from "../domain/directory.types";

@Injectable()
export class DirectoryPublicScopeResolver {
  private static readonly DEFAULT_SCOPE: DirectoryScope = {
    tenantId: "directory-public-tenant",
    workspaceId: "directory-public-workspace",
  };

  constructor(private readonly env: EnvService) {}

  resolveScope(): DirectoryScope {
    const tenantId = this.env.DIRECTORY_PUBLIC_TENANT_ID;
    const workspaceId = this.env.DIRECTORY_PUBLIC_WORKSPACE_ID;

    if ((tenantId && !workspaceId) || (!tenantId && workspaceId)) {
      throw new NotFoundError(
        "Public directory scope is not configured",
        {
          requiredEnv: ["DIRECTORY_PUBLIC_TENANT_ID", "DIRECTORY_PUBLIC_WORKSPACE_ID"],
        },
        DIRECTORY_ERROR_CODES.PUBLIC_SCOPE_NOT_CONFIGURED
      );
    }

    return {
      tenantId: tenantId ?? DirectoryPublicScopeResolver.DEFAULT_SCOPE.tenantId,
      workspaceId: workspaceId ?? DirectoryPublicScopeResolver.DEFAULT_SCOPE.workspaceId,
    };
  }
}
