import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { toast } from "sonner";
import { classesApi } from "@/lib/classes-api";
import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog } from "@/shared/crud";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  type FilterFieldDef,
  useListUrlState,
} from "@/shared/list-kit";
import { formatDateTime } from "@/shared/lib/formatters";
import { classGroupKeys, classSessionKeys } from "../queries";

const STATUS_OPTIONS = [
  { label: "Planned", value: "PLANNED" },
  { label: "Done", value: "DONE" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function SessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmStatus, setConfirmStatus] = useState<{
    id: string;
    status: "DONE" | "CANCELLED";
  } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [state, setUrlState] = useListUrlState(
    { pageSize: 10, sort: "startsAt:desc" },
    { storageKey: "class-sessions-list-v1" }
  );

  const { data: groupsData } = useQuery({
    queryKey: classGroupKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => classesApi.listClassGroups({ page: 1, pageSize: 100 }),
  });

  const groupOptions = useMemo(
    () => (groupsData?.items ?? []).map((group) => ({ value: group.id, label: group.name })),
    [groupsData]
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      { key: "classGroupId", label: "Class group", type: "select", options: groupOptions },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "dateFrom", label: "Date from", type: "date" },
      { key: "dateTo", label: "Date to", type: "date" },
    ],
    [groupOptions]
  );

  const filters = useMemo(() => {
    const classGroup = state.filters?.find(
      (f) => f.field === "classGroupId" && f.operator === "eq"
    );
    const status = state.filters?.find((f) => f.field === "status" && f.operator === "eq");
    const dateFrom = state.filters?.find((f) => f.field === "dateFrom" && f.operator === "gte");
    const dateTo = state.filters?.find((f) => f.field === "dateTo" && f.operator === "lte");
    return {
      classGroupId: classGroup ? String(classGroup.value) : undefined,
      status: status ? String(status.value) : undefined,
      dateFrom: dateFrom ? String(dateFrom.value) : undefined,
      dateTo: dateTo ? String(dateTo.value) : undefined,
    };
  }, [state.filters]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: classSessionKeys.list(state),
    queryFn: () =>
      classesApi.listSessions({
        q: state.q,
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        classGroupId: filters.classGroupId,
        status: filters.status as any,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        filters: state.filters,
      }),
    placeholderData: keepPreviousData,
  });

  const sessions = data?.items ?? [];

  const updateStatus = useMutation({
    mutationFn: async (payload: { id: string; status: "DONE" | "CANCELLED" }) =>
      classesApi.updateSession(payload.id, { status: payload.status }),
    onSuccess: async () => {
      toast.success("Session updated");
      setConfirmStatus(null);
      await queryClient.invalidateQueries({ queryKey: classSessionKeys.list(undefined) });
    },
    onError: () => toast.error("Failed to update session"),
  });

  return (
    <>
      <CrudListPageLayout
        title="Sessions"
        subtitle="Track planned and completed sessions"
        primaryAction={
          <Button variant="accent" onClick={() => navigate("/sessions")}>
            <CalendarDays className="h-4 w-4" />
            New session
          </Button>
        }
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: "Start (Newest)", value: "startsAt:desc" },
              { label: "Start (Oldest)", value: "startsAt:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || "Failed to load sessions"}
              </div>
            ) : null}
          </ListToolbar>
        }
        filters={
          (state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(filter) => {
                const next = state.filters?.filter((item) => item !== filter) ?? [];
                setUrlState({ filters: next, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No sessions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Starts
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Topic
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Status
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-sm">
                          {formatDateTime(session.startsAt, "de-DE")}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {session.topic || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {session.status}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{ label: "Open", href: `/sessions/${session.id}` }}
                            secondaryActions={[
                              {
                                label: "Mark done",
                                icon: <CheckCircle2 className="h-4 w-4" />,
                                onClick: () => setConfirmStatus({ id: session.id, status: "DONE" }),
                              },
                              {
                                label: "Cancel",
                                destructive: true,
                                icon: <XCircle className="h-4 w-4" />,
                                onClick: () =>
                                  setConfirmStatus({ id: session.id, status: "CANCELLED" }),
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
          </CardContent>
        </Card>
      </CrudListPageLayout>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        fields={filterFields}
        filters={state.filters ?? []}
        onApply={(filters) => setUrlState({ filters, page: 1 })}
      />

      <ConfirmDeleteDialog
        open={Boolean(confirmStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmStatus(null);
          }
        }}
        onConfirm={() => {
          if (confirmStatus) {
            updateStatus.mutate(confirmStatus);
          }
        }}
        title="Update session status?"
        description={`Set session to ${confirmStatus?.status === "DONE" ? "Done" : "Cancelled"}?`}
        confirmLabel="Confirm"
      />
    </>
  );
}
