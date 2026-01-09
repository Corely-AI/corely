import React from "react";
import { ChevronDown, PlusCircle, Building2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "./workspace-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ collapsed }) => {
  const { workspaces, activeWorkspaceId, setWorkspace, isLoading } = useWorkspace();
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!workspaces.length) {
    return (
      <Button
        variant="secondary"
        className="w-full justify-start"
        onClick={() => navigate("/onboarding")}
        data-testid="workspace-create-shortcut"
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        {collapsed ? "" : "Create workspace"}
      </Button>
    );
  }

  const active = workspaces.find((ws) => ws.id === activeWorkspaceId) ?? workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          size="sm"
          data-testid="workspace-switcher-trigger"
        >
          <div className="flex items-center gap-2 text-left">
            {active.kind === "COMPANY" ? (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">{active.name}</span>
              {!collapsed && (
                <span className="text-xs text-muted-foreground">
                  {active.currency ?? "—"} · {active.countryCode ?? "—"}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start" data-testid="workspace-switcher-menu">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => setWorkspace(ws.id)}
            className={ws.id === active.id ? "font-medium" : ""}
            data-testid={`workspace-option-${ws.id}`}
          >
            <div className="flex items-center gap-2">
              {ws.kind === "COMPANY" ? (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex flex-col">
                <span>{ws.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ws.currency ?? "—"} · {ws.countryCode ?? "—"}
                </span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/onboarding")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
