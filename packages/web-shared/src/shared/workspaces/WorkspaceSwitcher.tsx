import React from "react";
import { ChevronsUpDown, PlusCircle, Building2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "./workspace-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@corely/ui";
import { Button } from "@corely/ui";
import { Skeleton } from "@corely/ui";
import { cn } from "@corely/web-shared/shared/lib/utils";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
  allowCreate?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  collapsed,
  allowCreate = true,
}) => {
  const { workspaces, activeWorkspaceId, setWorkspace, isLoading } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!workspaces.length) {
    if (!allowCreate) {
      return null;
    }
    return (
      <Button
        variant="secondary"
        className={cn("w-full transition-all", collapsed ? "justify-center px-0" : "justify-start")}
        onClick={() => navigate("/onboarding")}
        data-testid="workspace-create-shortcut"
      >
        <PlusCircle className={cn("h-4 w-4 shrink-0", !collapsed && "mr-2")} />
        {!collapsed && <span>{t("workspace.create")}</span>}
      </Button>
    );
  }

  const active = workspaces.find((ws) => ws.id === activeWorkspaceId) ?? workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between transition-all outline-none focus-visible:ring-0",
            collapsed && "justify-center px-0"
          )}
          size="sm"
          data-testid="workspace-switcher-trigger"
        >
          <div className="flex items-center gap-2 text-left">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium leading-tight truncate">{active.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {active.currency ?? "—"} · {active.countryCode ?? "—"}
                </span>
              </div>
            )}
          </div>
          {!collapsed && <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start" data-testid="workspace-switcher-menu">
        <DropdownMenuLabel>{t("workspace.title")}</DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => {
              if (searchParams.has("workspaceId")) {
                const next = new URLSearchParams(searchParams);
                next.set("workspaceId", ws.id);
                setSearchParams(next, { replace: true });
                return;
              }
              setWorkspace(ws.id);
            }}
            className={ws.id === active.id ? "font-medium" : ""}
            data-testid={`workspace-option-${ws.id}`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                <span>{ws.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ws.currency ?? "—"} · {ws.countryCode ?? "—"}
                </span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        {allowCreate && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/onboarding")}>
              <PlusCircle className="h-4 w-4 mr-2" />
              {t("workspace.create")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
