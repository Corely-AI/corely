import React from "react";
import { User, Building2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";

export function WorkspaceTypeBadge() {
  const { config } = useWorkspaceConfig();

  if (!config) {return null;}

  return (
    <div className="px-3 py-2 mt-4">
      <Badge variant="outline" className="text-xs">
        {config.kind === "PERSONAL" ? (
          <>
            <User className="h-3 w-3 mr-1" />
            Freelancer
          </>
        ) : (
          <>
            <Building2 className="h-3 w-3 mr-1" />
            Company
          </>
        )}
      </Badge>
    </div>
  );
}
