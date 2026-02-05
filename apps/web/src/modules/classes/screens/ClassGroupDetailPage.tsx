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

  const { data: customersData } = useQuery({
    queryKey: ["customers", "options"],
    queryFn: () => customersApi.listCustomers({ pageSize: 50 }),
  });

  const group = groupData?.classGroup;
  const enrollments = enrollmentData?.items ?? [];
  const sessions = sessionData?.items ?? [];
  const customers = customersData?.customers ?? [];

  const [selectedClientId, setSelectedClientId] = useState("");
  const [overridePrice, setOverridePrice] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [sessionTopic, setSessionTopic] = useState("");

  const addEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) {
        throw new Error("Select a student");
      }
      const override = overridePrice ? Math.round(Number(overridePrice) * 100) : undefined;
      return classesApi.upsertEnrollment({
        classGroupId: groupId,
        clientId: selectedClientId,
        priceOverridePerSession: override,
        isActive: true,
      });
    },
    onSuccess: async () => {
      toast.success("Student enrolled");
      setSelectedClientId("");
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
      customers.map((customer) => ({
        value: customer.id,
        label: customer.displayName || customer.id,
      })),
    [customers]
  );

  if (isGroupLoading) {
    return <div className="text-muted-foreground">Loading class group...</div>;
  }

  if (!group) {
    return <div className="text-muted-foreground">Class group not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">{group.name}</div>
          <div className="text-sm text-muted-foreground">
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
          <div className="grid gap-3 md:grid-cols-[1fr_160px_120px] items-end">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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
              onClick={() => addEnrollment.mutate()}
              disabled={!selectedClientId || addEnrollment.isPending}
            >
              Enroll
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
                    Price override
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-sm">
                      {customers.find((c) => c.id === enrollment.clientId)?.displayName ||
                        enrollment.clientId}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {enrollment.isActive ? "Active" : "Inactive"}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {enrollment.priceOverridePerSession
                        ? formatMoney(enrollment.priceOverridePerSession, undefined, group.currency)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
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
                    <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={4}>
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
          <div className="grid gap-3 md:grid-cols-[1fr_120px_160px_120px] items-end">
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
              onClick={() => createSession.mutate()}
              disabled={createSession.isPending}
            >
              Add session
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">
                    Starts
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">
                    Topic
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">
                    Status
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-sm">
                      {formatDateTime(session.startsAt, "de-DE")}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {session.topic || "—"}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{session.status}</td>
                    <td className="px-3 py-2 text-right">
                      <CrudRowActions
                        primaryAction={{ label: "Open", href: `/sessions/${session.id}` }}
                      />
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={4}>
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
