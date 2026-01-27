/**
 * @corely/web-ee - WorkspaceSwitcher
 *
 * EE-only workspace/tenant switcher component.
 * This component should ONLY be rendered in EE edition.
 */

import React from "react";

export interface WorkspaceDto {
  id: string;
  name: string;
  kind?: "COMPANY" | "PERSONAL";
  currency?: string;
  countryCode?: string;
}

export interface WorkspaceSwitcherProps {
  /**
   * List of available workspaces for the current user
   */
  workspaces: WorkspaceDto[];

  /**
   * Currently active workspace ID
   */
  activeWorkspaceId: string | null;

  /**
   * Callback when user selects a different workspace
   */
  onWorkspaceChange: (workspaceId: string) => void;

  /**
   * Callback when user clicks create workspace
   */
  onCreateWorkspace?: () => void;

  /**
   * Whether the switcher is in a collapsed state (icon only)
   */
  collapsed?: boolean;

  /**
   * Whether workspaces are currently loading
   */
  isLoading?: boolean;

  /**
   * UI components passed from the host app (to avoid duplicate dependencies)
   */
  ui: {
    Button: React.ComponentType<any>;
    DropdownMenu: React.ComponentType<any>;
    DropdownMenuTrigger: React.ComponentType<any>;
    DropdownMenuContent: React.ComponentType<any>;
    DropdownMenuItem: React.ComponentType<any>;
    DropdownMenuLabel: React.ComponentType<any>;
    DropdownMenuSeparator: React.ComponentType<any>;
    Skeleton: React.ComponentType<any>;
    ChevronDownIcon: React.ComponentType<any>;
    PlusCircleIcon: React.ComponentType<any>;
    Building2Icon: React.ComponentType<any>;
    UserIcon: React.ComponentType<any>;
  };
}

/**
 * EE WorkspaceSwitcher component
 *
 * Usage from host app:
 * ```tsx
 * import { WorkspaceSwitcher } from '@corely/web-ee';
 *
 * <WorkspaceSwitcher
 *   workspaces={workspaces}
 *   activeWorkspaceId={activeId}
 *   onWorkspaceChange={handleChange}
 *   onCreateWorkspace={handleCreate}
 *   ui={{ Button, DropdownMenu, ... }}
 * />
 * ```
 */
export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  onCreateWorkspace,
  collapsed = false,
  isLoading = false,
  ui,
}) => {
  const {
    Button,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    Skeleton,
    ChevronDownIcon,
    PlusCircleIcon,
    Building2Icon,
    UserIcon,
  } = ui;

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!workspaces.length) {
    return (
      <Button
        variant="secondary"
        className="w-full justify-start"
        onClick={onCreateWorkspace}
        data-testid="workspace-create-shortcut"
      >
        <PlusCircleIcon className="h-4 w-4 mr-2" />
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
              <Building2Icon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <UserIcon className="h-4 w-4 text-muted-foreground" />
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
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start" data-testid="workspace-switcher-menu">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => onWorkspaceChange(ws.id)}
            className={ws.id === active.id ? "font-medium" : ""}
            data-testid={`workspace-option-${ws.id}`}
          >
            <div className="flex items-center gap-2">
              {ws.kind === "COMPANY" ? (
                <Building2Icon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <UserIcon className="h-4 w-4 text-muted-foreground" />
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
        {onCreateWorkspace && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateWorkspace}>
              <PlusCircleIcon className="h-4 w-4 mr-2" />
              Create workspace
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
