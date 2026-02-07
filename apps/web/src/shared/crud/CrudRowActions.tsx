import React from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@corely/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@corely/ui";
import { cn } from "@/shared/lib/utils";

export type CrudAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  tooltip?: string;
  "data-testid"?: string;
};

type CrudRowActionsProps = {
  primaryAction?: CrudAction;
  secondaryActions?: CrudAction[];
  align?: "start" | "end";
};

export const CrudRowActions: React.FC<CrudRowActionsProps> = ({
  primaryAction,
  secondaryActions = [],
  align = "end",
}) => {
  const renderActionButton = (action: CrudAction) => {
    if (action.href) {
      return (
        <Button
          variant="ghost"
          size="sm"
          asChild
          disabled={action.disabled}
          title={action.tooltip}
          data-testid={action["data-testid"]}
        >
          <Link to={action.href}>{action.label}</Link>
        </Button>
      );
    }
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={action.onClick}
        disabled={action.disabled}
        title={action.tooltip}
        data-testid={action["data-testid"]}
      >
        {action.label}
      </Button>
    );
  };

  return (
    <div className={cn("flex items-center gap-1", align === "end" && "justify-end")}>
      {primaryAction ? renderActionButton(primaryAction) : null}
      {secondaryActions.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align}>
            {secondaryActions.map((action) => (
              <DropdownMenuItem
                key={action.label}
                className={cn(action.destructive && "text-destructive")}
                onClick={action.onClick}
                disabled={action.disabled}
                title={action.tooltip}
                {...(action["data-testid"] ? { "data-testid": action["data-testid"] } : {})}
                asChild={Boolean(action.href)}
              >
                {action.href ? (
                  <Link to={action.href} className="flex items-center gap-2">
                    {action.icon}
                    <span>{action.label}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    {action.icon}
                    <span>{action.label}</span>
                  </div>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
};
