import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@corely/ui";
import { toast } from "sonner";
import { classesApi } from "@/lib/classes-api";
import { customersApi } from "@/lib/customers-api";
import { classEnrollmentKeys, classSessionKeys, classAttendanceKeys } from "../queries";
import { formatDateTime } from "@/shared/lib/formatters";

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "MAKEUP", "EXCUSED"] as const;

type AttendanceDraft = {
  enrollmentId: string;
  status: (typeof ATTENDANCE_STATUSES)[number];
  billable: boolean;
  note: string;
};

const defaultBillable = (status: AttendanceDraft["status"]) =>
  status === "PRESENT" || status === "MAKEUP";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id ?? "";
  const queryClient = useQueryClient();

  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: classSessionKeys.detail(sessionId),
    queryFn: () => classesApi.getSession(sessionId),
    enabled: Boolean(sessionId),
  });

  const session = sessionData?.session;

  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: classAttendanceKeys.session(sessionId),
    queryFn: () => classesApi.getSessionAttendance(sessionId),
    enabled: Boolean(sessionId),
  });

  const { data: enrollmentData } = useQuery({
    queryKey: classEnrollmentKeys.list({ classGroupId: session?.classGroupId }),
    queryFn: () =>
      classesApi.listEnrollments({ classGroupId: session?.classGroupId, page: 1, pageSize: 200 }),
    enabled: Boolean(session?.classGroupId),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers", "options"],
    queryFn: () => customersApi.listCustomers({ pageSize: 200 }),
  });

  const locked = attendanceData?.locked ?? false;
  const enrollments = enrollmentData?.items ?? [];
  const attendanceItems = attendanceData?.items ?? [];
  const customers = customersData?.customers ?? [];

  const nameByClient = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((customer) => {
      map.set(customer.id, customer.displayName || customer.id);
    });
    return map;
  }, [customers]);

  const draftRows = useMemo<AttendanceDraft[]>(() => {
    const byEnrollment = new Map(attendanceItems.map((item) => [item.enrollmentId, item]));
    return enrollments.map((enrollment) => {
      const existing = byEnrollment.get(enrollment.id);
      return {
        enrollmentId: enrollment.id,
        status: (existing?.status as AttendanceDraft["status"]) ?? "PRESENT",
        billable: existing?.billable ?? defaultBillable("PRESENT"),
        note: existing?.note ?? "",
      };
    });
  }, [attendanceItems, enrollments]);

  const [rows, setRows] = useState<AttendanceDraft[]>([]);

  useEffect(() => {
    setRows(draftRows);
  }, [draftRows]);

  const mutation = useMutation({
    mutationFn: async () =>
      classesApi.upsertAttendance(sessionId, {
        items: rows.map((row) => ({
          enrollmentId: row.enrollmentId,
          status: row.status,
          billable: row.billable,
          note: row.note || undefined,
        })),
      }),
    onSuccess: async () => {
      toast.success("Attendance saved");
      await queryClient.invalidateQueries({ queryKey: classAttendanceKeys.session(sessionId) });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save attendance"),
  });

  const updateRow = (index: number, patch: Partial<AttendanceDraft>) => {
    setRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) {
          return row;
        }
        const next = { ...row, ...patch };
        if (patch.status) {
          next.billable = defaultBillable(patch.status);
        }
        return next;
      })
    );
  };

  const markAll = (status: AttendanceDraft["status"]) => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        status,
        billable: defaultBillable(status),
      }))
    );
  };

  if (isSessionLoading || isAttendanceLoading) {
    return <div className="text-muted-foreground">Loading session...</div>;
  }

  if (!session) {
    return <div className="text-muted-foreground">Session not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">Session detail</div>
          <div className="text-sm text-muted-foreground">
            {formatDateTime(session.startsAt, "de-DE")} • {session.status}
          </div>
        </div>
        <Button
          variant="accent"
          onClick={() => mutation.mutate()}
          disabled={locked || mutation.isPending}
        >
          Save attendance
        </Button>
      </div>

      {locked ? (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            This month is locked. Attendance is read-only.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => markAll("PRESENT")} disabled={locked}>
              <CheckCircle2 className="h-4 w-4" />
              Mark all present
            </Button>
            <Button variant="outline" onClick={() => markAll("ABSENT")} disabled={locked}>
              <XCircle className="h-4 w-4" />
              Mark all absent
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">
                    Student
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">
                    Status
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">
                    Billable
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const enrollment = enrollments.find((e) => e.id === row.enrollmentId);
                  const studentName = enrollment
                    ? (nameByClient.get(enrollment.studentClientId) ?? enrollment.studentClientId)
                    : row.enrollmentId;
                  return (
                    <tr key={row.enrollmentId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-sm">{studentName}</td>
                      <td className="px-3 py-2 text-sm">
                        <Select
                          value={row.status}
                          onValueChange={(value) =>
                            updateRow(index, { status: value as AttendanceDraft["status"] })
                          }
                          disabled={locked}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTENDANCE_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <Switch
                          checked={row.billable}
                          onCheckedChange={(checked) =>
                            updateRow(index, { billable: Boolean(checked) })
                          }
                          disabled={locked}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <Input
                          value={row.note}
                          onChange={(e) => updateRow(index, { note: e.target.value })}
                          disabled={locked}
                        />
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={4}>
                      No enrollments found for this session.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
