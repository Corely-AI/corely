import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Plus, Trash2, Users } from "lucide-react";
import { Card, CardContent, Badge, Button } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog } from "@/shared/crud";
import { withWorkspace } from "@/shared/workspaces/workspace-query-keys";
import { toast } from "sonner";

export default function StudentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const studentsListKey = withWorkspace(["students", "list"]);

  const {
    data: studentsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: studentsListKey,
    queryFn: async () => {
      const result = await customersApi.listCustomers({ role: "STUDENT" });
      const primaryPayerEntries = await Promise.all(
        (result.customers ?? []).map(async (student) => {
          try {
            const guardians = await customersApi.listStudentGuardians(student.id);
            const primary = guardians.guardians.find((g) => g.isPrimaryPayer);
            return [student.id, primary?.guardian.displayName ?? null] as const;
          } catch {
            return [student.id, null] as const;
          }
        })
      );
      const primaryPayerByStudentId = Object.fromEntries(primaryPayerEntries);
      return { students: result.customers ?? [], primaryPayerByStudentId };
    },
  });

  const students = studentsData?.students ?? [];
  const primaryPayerByStudentId = studentsData?.primaryPayerByStudentId ?? {};

  const archiveStudent = useMutation({
    mutationFn: (id: string) => customersApi.archiveCustomer(id, "STUDENT"),
    onSuccess: async () => {
      toast.success("Student archived");
      await queryClient.invalidateQueries({ queryKey: studentsListKey });
    },
    onError: () => toast.error("Failed to archive student"),
  });

  const primaryAction = (
    <Button variant="accent" onClick={() => navigate("/students/new")}>
      <Plus className="h-4 w-4" />
      Add student
    </Button>
  );

  return (
    <CrudListPageLayout
      title="Students"
      subtitle="Manage student records and guardians"
      primaryAction={primaryAction}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading students...</div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive">Failed to load students.</div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Create your first student to start tracking guardians and enrollments."
              action={primaryAction}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Student
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Email
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Phone
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Primary payer
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Updated
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                            {student.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{student.displayName}</div>
                            {student.vatId && (
                              <div className="text-xs text-muted-foreground">{student.vatId}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {student.email ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{student.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {student.phone ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{student.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {primaryPayerByStudentId[student.id] ? (
                          <span>{primaryPayerByStudentId[student.id]}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {student.archivedAt ? (
                          <Badge variant="outline">Archived</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {student.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CrudRowActions
                          primaryAction={{
                            label: "Open",
                            href: `/students/${student.id}`,
                          }}
                          secondaryActions={[
                            {
                              label: "Edit",
                              href: `/students/${student.id}`,
                            },
                            {
                              label: "Archive",
                              destructive: true,
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => setDeleteTarget(student.id),
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
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        trigger={null}
        title="Archive student"
        description="This will archive the student. You can unarchive them later."
        isLoading={archiveStudent.isPending}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          archiveStudent.mutate(deleteTarget);
        }}
      />
    </CrudListPageLayout>
  );
}
