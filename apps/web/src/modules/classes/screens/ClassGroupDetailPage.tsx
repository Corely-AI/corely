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
import { classesApi } from "@/lib/classes-api";
import { customersApi } from "@/lib/customers-api";
import { formatDate, formatDateTime, formatMoney } from "@/shared/lib/formatters";
import { CrudRowActions } from "@/shared/crud";
import { classGroupKeys, classEnrollmentKeys, classSessionKeys } from "../queries";

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

  const { data: sessionData } = useQuery({
    queryKey: classSessionKeys.list({ classGroupId: groupId }),
    queryFn: () => classesApi.listSessions({ classGroupId: groupId, page: 1, pageSize: 20 }),
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

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedPayerId, setSelectedPayerId] = useState("");
  const [overridePrice, setOverridePrice] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [sessionTopic, setSessionTopic] = useState("");

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

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-sm font-semibold">Sessions</div>
          <div className="grid gap-4 md:grid-cols-[1fr_120px_160px_120px] items-end">
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input
                type="datetime-local"
                value={sessionStart}
                onChange={(e) => setSessionStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min="15"
                step="15"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input value={sessionTopic} onChange={(e) => setSessionTopic(e.target.value)} />
            </div>
            <Button
              variant="accent"
              className="w-full"
              onClick={() => createSession.mutate()}
              disabled={createSession.isPending}
            >
              Add session
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
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
                  <tr
                    key={session.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatDateTime(session.startsAt, "de-DE")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {session.topic || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{session.status}</td>
                    <td className="px-4 py-3 text-right">
                      <CrudRowActions
                        primaryAction={{ label: "Open", href: `/sessions/${session.id}` }}
                      />
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-center text-muted-foreground" colSpan={4}>
                      No sessions scheduled yet.
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
