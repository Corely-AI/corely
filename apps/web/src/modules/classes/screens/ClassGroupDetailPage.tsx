import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Users, Edit2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { toast } from "sonner";
import { ApiError, normalizeError } from "@corely/api-client";
import { classesApi } from "@/lib/classes-api";
import { customersApi } from "@/lib/customers-api";
import { formatDate, formatMoney } from "@/shared/lib/formatters";
import { classGroupKeys, classEnrollmentKeys, classSessionKeys } from "../queries";
import { CrudRowActions } from "@/shared/crud";
import { MaterialsSection } from "../../portal/components/MaterialsSection";
import { SessionsPanel } from "../components/SessionsPanel";

export default function ClassGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: groupData, isLoading: isGroupLoading } = useQuery({
    queryKey: classGroupKeys.detail(groupId),
    queryFn: () => classesApi.getClassGroup(groupId),
    enabled: Boolean(groupId),
  });

  const { data: enrollmentData } = useQuery({
    queryKey: classEnrollmentKeys.list({ classGroupId: groupId }),
    queryFn: () => classesApi.listEnrollments({ classGroupId: groupId, page: 1, pageSize: 50 }),
    enabled: Boolean(groupId),
  });

  const [sessionsPage, setSessionsPage] = useState(1);

  const { data: sessionData } = useQuery({
    queryKey: classSessionKeys.list({ classGroupId: groupId, page: sessionsPage }),
    queryFn: () =>
      classesApi.listSessions({ classGroupId: groupId, page: sessionsPage, pageSize: 10 }),
    enabled: Boolean(groupId),
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students", "options"],
    queryFn: () => customersApi.listCustomers({ pageSize: 100, role: "STUDENT" }),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers", "options"],
    queryFn: () => customersApi.listCustomers({ pageSize: 100 }),
  });

  const group = groupData?.classGroup;
  const enrollments = enrollmentData?.items ?? [];
  const sessions = sessionData?.items ?? [];
  const students = studentsData?.customers ?? [];
  const customers = customersData?.customers ?? [];
  const hasRecurringSchedule = Boolean(group?.schedulePattern);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedPayerId, setSelectedPayerId] = useState("");
  const [overridePrice, setOverridePrice] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [sessionTopic, setSessionTopic] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: guardiansData } = useQuery({
    queryKey: ["students", selectedStudentId, "guardians"],
    queryFn: () => customersApi.listStudentGuardians(selectedStudentId),
    enabled: Boolean(selectedStudentId),
  });

  const guardians = guardiansData?.guardians ?? [];
  const primaryPayerId = guardians.find((guardian) => guardian.isPrimaryPayer)?.guardian.id ?? "";

  React.useEffect(() => {
    if (!selectedStudentId) {
      setSelectedPayerId("");
      return;
    }
    if (primaryPayerId) {
      setSelectedPayerId(primaryPayerId);
    }
  }, [primaryPayerId, selectedStudentId]);

  const addEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId) {
        throw new Error("Select a student");
      }
      if (!selectedPayerId) {
        throw new Error("Select a payer");
      }
      const override = overridePrice ? Math.round(Number(overridePrice) * 100) : undefined;
      return classesApi.upsertEnrollment({
        classGroupId: groupId,
        studentClientId: selectedStudentId,
        payerClientId: selectedPayerId,
        priceOverridePerSession: override,
        isActive: true,
      });
    },
    onSuccess: async () => {
      toast.success("Student enrolled");
      setSelectedStudentId("");
      setSelectedPayerId("");
      setOverridePrice("");
      await queryClient.invalidateQueries({
        queryKey: classEnrollmentKeys.list({ classGroupId: groupId }),
      });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to enroll student"),
  });

  const deactivateEnrollment = useMutation({
    mutationFn: async (enrollmentId: string) =>
      classesApi.updateEnrollment(enrollmentId, { isActive: false }),
    onSuccess: async () => {
      toast.success("Enrollment deactivated");
      await queryClient.invalidateQueries({
        queryKey: classEnrollmentKeys.list({ classGroupId: groupId }),
      });
    },
    onError: () => toast.error("Failed to update enrollment"),
  });

  const createSession = useMutation({
    mutationFn: async () => {
      if (!sessionStart) {
        throw new Error("Pick a start time");
      }
      const startsAt = new Date(sessionStart);
      const duration = Number(sessionDuration) || 60;
      const endsAt = new Date(startsAt.getTime() + duration * 60_000);
      return classesApi.createSession({
        classGroupId: groupId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        topic: sessionTopic || undefined,
      });
    },
    onSuccess: async () => {
      toast.success("Session added");
      setSessionStart("");
      setSessionDuration("60");
      setSessionTopic("");
      await queryClient.invalidateQueries({
        queryKey: classSessionKeys.list({ classGroupId: groupId }),
      });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add session"),
  });

  const generateSessionsForMonth = useMutation({
    mutationFn: async (month?: string) => classesApi.generateClassGroupSessions(groupId, { month }),
    onSuccess: async (data) => {
      const count = data.items.length;
      toast.success(
        count > 0
          ? `Generated ${count} session${count === 1 ? "" : "s"} for this month.`
          : "Sessions are already up to date."
      );
      await queryClient.invalidateQueries({
        queryKey: classSessionKeys.list({ classGroupId: groupId }),
      });
    },
    onError: (error) => {
      const apiError = error instanceof ApiError ? error : normalizeError(error);
      if (apiError.code === "Classes:MonthLocked") {
        toast.error("Month is locked", {
          description:
            apiError.detail ||
            "This month has already been billed. Reopen the month or create an adjustment.",
        });
        console.warn("Classes:MonthLocked", {
          code: apiError.code,
          status: apiError.status,
        });
        return;
      }

      if (
        apiError.status === 403 &&
        (apiError.code === "Common:Http403" ||
          apiError.code === "Common:Forbidden" ||
          apiError.detail.toLowerCase().includes("classes.write") ||
          apiError.detail.toLowerCase().includes("permission"))
      ) {
        toast.error("Cannot generate sessions for current month", {
          description:
            "This month may already be billed/locked, or your current workspace context does not match this class group.",
        });
        console.warn("Generate sessions blocked", { code: apiError.code, status: apiError.status });
        return;
      }

      toast.error(apiError.detail || "Failed to generate sessions");
      console.warn("Generate sessions failed", { code: apiError.code, status: apiError.status });
    },
  });

  const rosterOptions = useMemo(
    () =>
      students.map((student) => ({
        value: student.id,
        label: student.displayName || student.id,
      })),
    [students]
  );

  const payerOptions = useMemo(() => {
    const options = [
      ...guardians.map((guardian) => ({
        value: guardian.guardian.id,
        label: guardian.guardian.displayName || guardian.guardian.id,
      })),
      ...customers.map((customer) => ({
        value: customer.id,
        label: customer.displayName || customer.id,
      })),
    ];
    const unique = new Map<string, { value: string; label: string }>();
    options.forEach((option) => {
      if (!unique.has(option.value)) {
        unique.set(option.value, option);
      }
    });
    return Array.from(unique.values());
  }, [customers, guardians]);

  const nameByClient = useMemo(() => {
    const map = new Map<string, string>();
    [...students, ...customers].forEach((customer) => {
      map.set(customer.id, customer.displayName || customer.id);
    });
    return map;
  }, [customers, students]);

  if (isGroupLoading) {
    return <div className="text-muted-foreground">Loading class group...</div>;
  }

  if (!group) {
    return <div className="text-muted-foreground">Class group not found.</div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-foreground">{group.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {group.subject} • {group.level}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate(`/class-groups/${group.id}/edit`)}>
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="accent"
            onClick={() => setSessionStart(new Date().toISOString().slice(0, 16))}
          >
            <CalendarPlus className="h-4 w-4" />
            Add session
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Default price</div>
            <div className="text-lg font-semibold">
              {formatMoney(group.defaultPricePerSession, undefined, group.currency)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="text-lg font-semibold">
              {group.status === "ACTIVE" ? "Active" : "Archived"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Updated</div>
            <div className="text-lg font-semibold">{formatDate(group.updatedAt, "en-US")}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" /> Roster
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px_120px] items-end">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {rosterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payer</Label>
              <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payer" />
                </SelectTrigger>
                <SelectContent>
                  {payerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Override price</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
              />
            </div>
            <Button
              variant="accent"
              className="w-full"
              onClick={() => addEnrollment.mutate()}
              disabled={!selectedStudentId || !selectedPayerId || addEnrollment.isPending}
            >
              Enroll
            </Button>
          </div>

          {!primaryPayerId && selectedStudentId ? (
            <div className="text-xs text-muted-foreground mt-[-0.5rem]">
              No primary payer set for this student.
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    Student
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    Payer
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    Price override
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {nameByClient.get(enrollment.studentClientId) ?? enrollment.studentClientId}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {nameByClient.get(enrollment.payerClientId) ?? enrollment.payerClientId}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {enrollment.isActive ? "Active" : "Inactive"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {enrollment.priceOverridePerSession
                        ? formatMoney(enrollment.priceOverridePerSession, undefined, group.currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CrudRowActions
                        primaryAction={{
                          label: "Deactivate",
                          onClick: () => deactivateEnrollment.mutate(enrollment.id),
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {enrollments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-center text-muted-foreground" colSpan={5}>
                      No students enrolled yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SessionsPanel
        groupId={groupId}
        sessionData={sessionData}
        sessionsPage={sessionsPage}
        onSessionsPageChange={setSessionsPage}
        sessionStart={sessionStart}
        sessionDuration={sessionDuration}
        sessionTopic={sessionTopic}
        hasRecurringSchedule={hasRecurringSchedule}
        onSessionStartChange={setSessionStart}
        onSessionDurationChange={setSessionDuration}
        onSessionTopicChange={setSessionTopic}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onAddSession={() => createSession.mutate()}
        onGenerateSessions={(m) => generateSessionsForMonth.mutate(m)}
        createSessionPending={createSession.isPending}
        generateSessionsPending={generateSessionsForMonth.isPending}
      />

      <MaterialsSection entityId={groupId} entityType="CLASS_GROUP" />
    </div>
  );
}
