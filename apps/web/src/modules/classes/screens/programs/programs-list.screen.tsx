import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { LoadingSkeleton, Button } from "@corely/ui";
import { toast } from "sonner";
import { ConfirmDeleteDialog, CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import { EmptyState } from "@/shared/components/EmptyState";
import { formatDate } from "@/shared/lib/formatters";
import { useDeleteProgramMutation, useProgramsListQuery } from "../../hooks/use-classes-academy";

export default function ProgramsListScreen() {
  const uiCopy = useUiCopy("ui.classes-programs-programs-list-screen");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useProgramsListQuery({
    page: 1,
    pageSize: 50,
    sort: "updatedAt:desc",
  });
  const deleteProgram = useDeleteProgramMutation();

  const items = data?.items ?? [];

  return (
    <CrudListPageLayout
      title={uiCopy("programs")}
      subtitle="Program templates for cohort creation"
      primaryAction={
        <Button
          variant="accent"
          data-testid="classes-programs-new-button"
          onClick={() => navigate("/classes/programs/new")}
        >
          <Plus className="h-4 w-4" />
          {uiCopy("new-combo")}
        </Button>
      }
    >
      <div data-testid="classes-programs-list">
        {isLoading ? (
          <LoadingSkeleton variant="list" label={uiCopy("loading-combos")} />
        ) : isError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm">
            <div className="mb-3 text-destructive">{uiCopy("failed-to-load-combos")}</div>
            <Button variant="outline" onClick={() => void refetch()}>
              {uiCopy("retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={uiCopy("no-combos-yet")}
            description={uiCopy("create-your-first-combo")}
            action={
              <Button asChild variant="accent">
                <Link to="/classes/programs/new">{uiCopy("new-combo")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {uiCopy("title")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {uiCopy("level-tag")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {uiCopy("expected-sessions")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {uiCopy("updated-at")}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((program) => (
                  <tr
                    key={program.id}
                    className="border-b border-border last:border-0"
                    data-testid={`classes-program-row-${program.id}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{program.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {program.levelTag || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {program.expectedSessionsCount ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(program.updatedAt, "en-US")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CrudRowActions
                        primaryAction={{ label: "Open", href: `/classes/programs/${program.id}` }}
                        secondaryActions={[
                          { label: "Edit", href: `/classes/programs/${program.id}/edit` },
                          {
                            label: "Delete",
                            destructive: true,
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: () => setDeleteTarget(program.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        trigger={null}
        title={uiCopy("delete-combo")}
        description={uiCopy("this-will-permanently-delete")}
        isLoading={deleteProgram.isPending}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          deleteProgram.mutate(deleteTarget, {
            onSuccess: () => {
              toast.success(uiCopy("combo-deleted"));
            },
            onError: (error) => {
              toast.error(error instanceof Error ? error.message : "Failed to delete combo");
            },
          });
          setDeleteTarget(null);
        }}
      />
    </CrudListPageLayout>
  );
}
