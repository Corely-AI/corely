import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@corely/ui";
import { toast } from "sonner";
import type {
  BillingPlanType,
  ClassEnrollmentStatus,
  ClassResourceType,
  ClassResourceVisibility,
  ClassGroupInstructorRole,
  MilestoneCompletionStatus,
  ClassSessionType,
  MeetingProvider,
} from "@corely/contracts";
import { classesApi } from "@/lib/classes-api";
import { formatDate, formatDateTime, formatMoney } from "@/shared/lib/formatters";
import {
  useApproveApplicationMutation,
  useBillingPlanQuery,
  useCohortQuery,
  useCohortTeamQuery,
  useCreateApplicationMutation,
  useEnrollmentsQuery,
  useGenerateInvoicesMutation,
  useMilestoneMutations,
  useMilestonesQuery,
  useOutcomesSummaryQuery,
  useReorderResourcesMutation,
  useResourceMutations,
  useResourcesQuery,
  useUpdateCohortLifecycleMutation,
  useUpsertBillingPlanMutation,
  useUpsertCohortTeamMutation,
} from "../../hooks/use-classes-academy";

const ENROLLMENT_STATUSES: ClassEnrollmentStatus[] = [
  "APPLIED",
  "ENROLLED",
  "DEFERRED",
  "DROPPED",
  "COMPLETED",
];
const LIFECYCLE_NEXT: Record<string, string | null> = {
  DRAFT: "PUBLISHED",
  PUBLISHED: "RUNNING",
  RUNNING: "ENDED",
  ENDED: "ARCHIVED",
  ARCHIVED: null,
};
const RESOURCE_TYPES: ClassResourceType[] = ["RECORDING", "DOC", "LINK"];
const RESOURCE_VISIBILITIES: ClassResourceVisibility[] = ["ENROLLED_ONLY", "PUBLIC"];
const TEAM_ROLES: ClassGroupInstructorRole[] = ["INSTRUCTOR", "MENTOR", "TA"];
const BILLING_TYPES: BillingPlanType[] = ["UPFRONT", "INSTALLMENTS", "INVOICE_NET"];
const MILESTONE_STATUS: MilestoneCompletionStatus[] = [
  "NOT_STARTED",
  "SUBMITTED",
  "PASSED",
  "FAILED",
];

export default function CohortDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const cohortId = id ?? "";

  const [activeTab, setActiveTab] = React.useState("overview");
  const [learnerStatus, setLearnerStatus] = React.useState<ClassEnrollmentStatus>("APPLIED");
  const [studentClientId, setStudentClientId] = React.useState("");
  const [payerClientId, setPayerClientId] = React.useState("");
  const [placementLevel, setPlacementLevel] = React.useState("");
  const [placementGoal, setPlacementGoal] = React.useState("");
  const [teamPartyId, setTeamPartyId] = React.useState("");
  const [teamRole, setTeamRole] = React.useState<ClassGroupInstructorRole>("MENTOR");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = React.useState<string>("");
  const [billingType, setBillingType] = React.useState<BillingPlanType>("UPFRONT");
  const [billingAmount, setBillingAmount] = React.useState("0");
  const [billingCurrency, setBillingCurrency] = React.useState("EUR");
  const [billingDueDate, setBillingDueDate] = React.useState("");
  const [milestoneTitle, setMilestoneTitle] = React.useState("");
  const [resourceType, setResourceType] = React.useState<ClassResourceType>("LINK");
  const [resourceTitle, setResourceTitle] = React.useState("");
  const [resourceUrl, setResourceUrl] = React.useState("");
  const [resourceDocumentId, setResourceDocumentId] = React.useState("");
  const [resourceVisibility, setResourceVisibility] =
    React.useState<ClassResourceVisibility>("ENROLLED_ONLY");

  const cohortQuery = useCohortQuery(cohortId);
  const teamQuery = useCohortTeamQuery(cohortId);
  const sessionsQuery = useQuery({
    queryKey: ["classes", "cohorts", cohortId, "sessions"],
    queryFn: () =>
      classesApi.listSessions({
        classGroupId: cohortId,
        page: 1,
        pageSize: 50,
      }),
    enabled: Boolean(cohortId),
  });
  const learnersQuery = useEnrollmentsQuery(cohortId, {
    status: learnerStatus,
    page: 1,
    pageSize: 100,
  });
  const enrolledLearnersQuery = useEnrollmentsQuery(cohortId, {
    status: "ENROLLED",
    page: 1,
    pageSize: 100,
  });
  const milestonesQuery = useMilestonesQuery(cohortId);
  const outcomesSummaryQuery = useOutcomesSummaryQuery(cohortId);
  const resourcesQuery = useResourcesQuery(cohortId);

  const lifecycleMutation = useUpdateCohortLifecycleMutation(cohortId);
  const upsertTeamMutation = useUpsertCohortTeamMutation(cohortId);
  const createApplicationMutation = useCreateApplicationMutation(cohortId);
  const approveApplicationMutation = useApproveApplicationMutation(cohortId);
  const upsertBillingPlanMutation = useUpsertBillingPlanMutation(selectedEnrollmentId || undefined);
  const generateInvoicesMutation = useGenerateInvoicesMutation(selectedEnrollmentId || undefined);
  const milestoneMutations = useMilestoneMutations(cohortId);
  const resourceMutations = useResourceMutations(cohortId);
  const reorderResourcesMutation = useReorderResourcesMutation(cohortId);
  const billingPlanQuery = useBillingPlanQuery(selectedEnrollmentId || undefined);

  const cohort = cohortQuery.data?.classGroup;
  const nextLifecycle = cohort ? LIFECYCLE_NEXT[cohort.lifecycle] : null;

  React.useEffect(() => {
    const firstEnrollment = enrolledLearnersQuery.data?.items?.[0];
    if (firstEnrollment && !selectedEnrollmentId) {
      setSelectedEnrollmentId(firstEnrollment.id);
      setBillingCurrency(firstEnrollment.currency ?? cohort?.currency ?? "EUR");
      if (firstEnrollment.priceCents) {
        setBillingAmount((firstEnrollment.priceCents / 100).toFixed(2));
      }
    }
  }, [cohort?.currency, enrolledLearnersQuery.data?.items, selectedEnrollmentId]);

  const onTransitionLifecycle = async () => {
    if (!nextLifecycle || !cohort) {
      return;
    }
    try {
      await lifecycleMutation.mutateAsync({ lifecycle: nextLifecycle as any });
      toast.success(`Cohort moved to ${nextLifecycle}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update lifecycle");
    }
  };

  const onAddTeamMember = async () => {
    if (!teamPartyId.trim()) {
      toast.error("partyId is required.");
      return;
    }
    const existing = teamQuery.data?.items ?? [];
    const nextMembers = [
      ...existing.map((member) => ({ partyId: member.partyId, role: member.role })),
      { partyId: teamPartyId.trim(), role: teamRole },
    ];
    try {
      await upsertTeamMutation.mutateAsync({ members: nextMembers });
      setTeamPartyId("");
      toast.success("Cohort team updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update team");
    }
  };

  const onCreateApplication = async () => {
    if (!studentClientId.trim() || !payerClientId.trim()) {
      toast.error("studentClientId and payerClientId are required.");
      return;
    }
    try {
      await createApplicationMutation.mutateAsync({
        studentClientId: studentClientId.trim(),
        payerClientId: payerClientId.trim(),
        placementLevel: placementLevel.trim() || undefined,
        placementGoal: placementGoal.trim() || undefined,
      });
      setStudentClientId("");
      setPayerClientId("");
      setPlacementLevel("");
      setPlacementGoal("");
      toast.success("Application created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create application");
    }
  };

  const onApproveApplication = async (enrollmentId: string) => {
    try {
      await approveApplicationMutation.mutateAsync({ enrollmentId, input: {} });
      toast.success("Application approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve application");
    }
  };

  const onUpsertBillingPlan = async () => {
    if (!selectedEnrollmentId) {
      toast.error("Select an enrolled learner first.");
      return;
    }
    const amountCents = Math.max(0, Math.round(Number(billingAmount || "0") * 100));
    try {
      if (billingType === "UPFRONT") {
        await upsertBillingPlanMutation.mutateAsync({
          type: "UPFRONT",
          scheduleJson: {
            type: "UPFRONT",
            data: {
              amountCents,
              currency: billingCurrency,
              dueDate: billingDueDate || undefined,
            },
          },
        });
      } else if (billingType === "INSTALLMENTS") {
        await upsertBillingPlanMutation.mutateAsync({
          type: "INSTALLMENTS",
          scheduleJson: {
            type: "INSTALLMENTS",
            data: {
              currency: billingCurrency,
              installments: [
                {
                  dueDate: billingDueDate || new Date().toISOString().slice(0, 10),
                  amountCents,
                },
              ],
            },
          },
        });
      } else {
        await upsertBillingPlanMutation.mutateAsync({
          type: "INVOICE_NET",
          scheduleJson: {
            type: "INVOICE_NET",
            data: {
              amountCents,
              currency: billingCurrency,
              netDays: 14,
            },
          },
        });
      }
      toast.success("Billing plan saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save billing plan");
    }
  };

  const onGenerateInvoices = async () => {
    try {
      await generateInvoicesMutation.mutateAsync({ sendInvoices: false });
      toast.success("Invoices generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate invoices");
    }
  };

  const onCreateMilestone = async () => {
    if (!milestoneTitle.trim()) {
      toast.error("Milestone title is required.");
      return;
    }
    try {
      await milestoneMutations.create.mutateAsync({
        title: milestoneTitle.trim(),
        type: "CHECKPOINT",
        required: true,
      });
      setMilestoneTitle("");
      toast.success("Milestone created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create milestone");
    }
  };

  const onCreateResource = async () => {
    if (!resourceTitle.trim()) {
      toast.error("Resource title is required.");
      return;
    }
    try {
      await resourceMutations.create.mutateAsync({
        type: resourceType,
        title: resourceTitle.trim(),
        url: resourceUrl.trim() || undefined,
        documentId: resourceDocumentId.trim() || undefined,
        visibility: resourceVisibility,
      });
      setResourceTitle("");
      setResourceUrl("");
      setResourceDocumentId("");
      toast.success("Resource created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create resource");
    }
  };

  const onMoveResource = async (resourceId: string, direction: "up" | "down") => {
    const resources = [...(resourcesQuery.data?.items ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
    const index = resources.findIndex((item) => item.id === resourceId);
    if (index < 0) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= resources.length) {
      return;
    }
    const swap = resources[targetIndex];
    resources[targetIndex] = resources[index];
    resources[index] = swap;
    try {
      await reorderResourcesMutation.mutateAsync({ orderedIds: resources.map((item) => item.id) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder resources");
    }
  };

  if (cohortQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading cohort...</div>;
  }

  if (cohortQuery.isError || !cohort) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load cohort.
        </div>
      </div>
    );
  }

  const sessions = sessionsQuery.data?.items ?? [];
  const learners = learnersQuery.data?.items ?? [];
  const enrolledLearners = enrolledLearnersQuery.data?.items ?? [];
  const milestones = milestonesQuery.data?.items ?? [];
  const resources = [...(resourcesQuery.data?.items ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  const groupedResources = RESOURCE_TYPES.map((type) => ({
    type,
    items: resources.filter((item) => item.type === type),
  }));
  const selectedEnrollment = enrolledLearners.find((item) => item.id === selectedEnrollmentId);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{cohort.name}</h1>
          <p className="text-sm text-muted-foreground">
            {cohort.startAt ? formatDate(cohort.startAt, "en-US") : "No start"} to{" "}
            {cohort.endAt ? formatDate(cohort.endAt, "en-US") : "No end"} · {cohort.timezone} ·{" "}
            {cohort.deliveryMode}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{cohort.lifecycle}</Badge>
          {nextLifecycle ? (
            <Button variant="accent" onClick={() => void onTransitionLifecycle()}>
              {nextLifecycle}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate(`/classes/cohorts/${cohort.id}/edit`)}>
            Edit
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Program</div>
                <div className="font-medium">{cohort.programId ?? "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Capacity</div>
                <div className="font-medium">{cohort.capacity ?? "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Community</div>
                <div className="font-medium break-all">{cohort.communityUrl ?? "—"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-base font-semibold">Team</h2>
              {(teamQuery.data?.items?.length ?? 0) === 0 ? (
                <div className="text-sm text-muted-foreground">No team members assigned yet.</div>
              ) : (
                <div className="space-y-2">
                  {TEAM_ROLES.map((role) => {
                    const members = (teamQuery.data?.items ?? []).filter(
                      (item) => item.role === role
                    );
                    if (members.length === 0) {
                      return null;
                    }
                    return (
                      <div key={role}>
                        <div className="text-xs uppercase text-muted-foreground">{role}</div>
                        <div className="text-sm">
                          {members.map((member) => member.partyId).join(", ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="partyId"
                  value={teamPartyId}
                  onChange={(event) => setTeamPartyId(event.target.value)}
                />
                <Select
                  value={teamRole}
                  onValueChange={(value) => setTeamRole(value as ClassGroupInstructorRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => void onAddTeamMember()}>
                  Add team member
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4 pt-4">
          {sessionsQuery.isLoading ? (
            <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              No sessions found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Starts at
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Meeting
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm">
                        {formatDateTime(session.startsAt, "en-US")}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {session.type as ClassSessionType}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {(session.meetingProvider ?? "—") as MeetingProvider | "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {session.meetingJoinUrl ? (
                          <a
                            className="text-accent underline"
                            href={session.meetingJoinUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Join
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="learners" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-base font-semibold">Create application</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Learner `studentClientId`</Label>
                  <Input
                    value={studentClientId}
                    onChange={(event) => setStudentClientId(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payer `payerClientId`</Label>
                  <Input
                    value={payerClientId}
                    onChange={(event) => setPayerClientId(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placement level</Label>
                  <Input
                    value={placementLevel}
                    onChange={(event) => setPlacementLevel(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placement goal</Label>
                  <Input
                    value={placementGoal}
                    onChange={(event) => setPlacementGoal(event.target.value)}
                  />
                </div>
              </div>
              <Button variant="accent" onClick={() => void onCreateApplication()}>
                Create APPLIED enrollment
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {ENROLLMENT_STATUSES.map((status) => (
              <Button
                key={status}
                variant={learnerStatus === status ? "accent" : "outline"}
                onClick={() => setLearnerStatus(status)}
              >
                {status}
              </Button>
            ))}
          </div>

          {learnersQuery.isLoading ? (
            <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              Loading learners...
            </div>
          ) : learners.length === 0 ? (
            <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              No learners with status {learnerStatus}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Learner
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Placement
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Payer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Price
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {learners.map((enrollment) => (
                    <tr key={enrollment.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm">{enrollment.studentClientId}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {enrollment.status}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {enrollment.placementLevel || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {enrollment.payerPartyId || enrollment.payerClientId}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {enrollment.priceCents != null
                          ? formatMoney(
                              enrollment.priceCents,
                              undefined,
                              enrollment.currency ?? "EUR"
                            )
                          : "—"}
                        {enrollment.discountLabel ? ` (${enrollment.discountLabel})` : ""}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {enrollment.status === "APPLIED" ? (
                          <Button
                            variant="outline"
                            onClick={() => void onApproveApplication(enrollment.id)}
                          >
                            Approve & enroll
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-base font-semibold">Enrollment billing plan</h2>
              {enrolledLearners.length === 0 ? (
                <div className="text-sm text-muted-foreground">No enrolled learners yet.</div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Enrollment</Label>
                      <Select value={selectedEnrollmentId} onValueChange={setSelectedEnrollmentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select enrollment" />
                        </SelectTrigger>
                        <SelectContent>
                          {enrolledLearners.map((enrollment) => (
                            <SelectItem key={enrollment.id} value={enrollment.id}>
                              {enrollment.studentClientId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Plan type</Label>
                      <Select
                        value={billingType}
                        onValueChange={(value) => setBillingType(value as BillingPlanType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_TYPES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={billingAmount}
                        onChange={(event) => setBillingAmount(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Input
                        value={billingCurrency}
                        onChange={(event) => setBillingCurrency(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due date</Label>
                      <Input
                        type="date"
                        value={billingDueDate}
                        onChange={(event) => setBillingDueDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Selected learner</Label>
                      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                        {selectedEnrollment?.studentClientId ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="accent" onClick={() => void onUpsertBillingPlan()}>
                      Save billing plan
                    </Button>
                    <Button variant="outline" onClick={() => void onGenerateInvoices()}>
                      Generate invoices
                    </Button>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                    Current plan:{" "}
                    {billingPlanQuery.data?.billingPlan
                      ? `${billingPlanQuery.data.billingPlan.type}`
                      : "No billing plan"}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4 pt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Required milestones</div>
                <div className="text-xl font-semibold">
                  {outcomesSummaryQuery.data?.summary.totalRequiredMilestones ?? 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Passed completions</div>
                <div className="text-xl font-semibold">
                  {outcomesSummaryQuery.data?.summary.totalCompletionsPassed ?? 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">At-risk learners</div>
                <div className="text-xl font-semibold">
                  {outcomesSummaryQuery.data?.summary.atRiskLearnersCount ?? 0}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-base font-semibold">Milestones</h2>
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Milestone title"
                  value={milestoneTitle}
                  onChange={(event) => setMilestoneTitle(event.target.value)}
                />
                <Button variant="accent" onClick={() => void onCreateMilestone()}>
                  Add milestone
                </Button>
              </div>
              {milestonesQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading milestones...</div>
              ) : milestones.length === 0 ? (
                <div className="text-sm text-muted-foreground">No milestones yet.</div>
              ) : (
                <div className="space-y-2">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">{milestone.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {milestone.type} · {milestone.required ? "Required" : "Optional"} · due{" "}
                          {milestone.dueAt ? formatDate(milestone.dueAt, "en-US") : "N/A"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={"NOT_STARTED"}
                          onValueChange={(value) => {
                            const firstEnrollmentId = enrolledLearners[0]?.id;
                            if (!firstEnrollmentId) {
                              toast.error("No enrolled learner to update completion for.");
                              return;
                            }
                            void milestoneMutations.upsertCompletion.mutateAsync({
                              milestoneId: milestone.id,
                              enrollmentId: firstEnrollmentId,
                              payload: { status: value as MilestoneCompletionStatus },
                            });
                          }}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MILESTONE_STATUS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() => void milestoneMutations.remove.mutateAsync(milestone.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-base font-semibold">Add resource</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={resourceType}
                    onValueChange={(value) => setResourceType(value as ClassResourceType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={resourceVisibility}
                    onValueChange={(value) =>
                      setResourceVisibility(value as ClassResourceVisibility)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_VISIBILITIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={resourceTitle}
                    onChange={(event) => setResourceTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL (for LINK/RECORDING)</Label>
                  <Input
                    value={resourceUrl}
                    onChange={(event) => setResourceUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Document ID (for DOC/RECORDING)</Label>
                  <Input
                    value={resourceDocumentId}
                    onChange={(event) => setResourceDocumentId(event.target.value)}
                  />
                </div>
              </div>
              <Button variant="accent" onClick={() => void onCreateResource()}>
                Add resource
              </Button>
            </CardContent>
          </Card>

          {resourcesQuery.isLoading ? (
            <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              Loading resources...
            </div>
          ) : (
            groupedResources.map((group) => (
              <Card key={group.type}>
                <CardContent className="space-y-3 p-6">
                  <h3 className="text-sm font-semibold">{group.type}</h3>
                  {group.items.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No {group.type.toLowerCase()} items.
                    </div>
                  ) : (
                    group.items.map((resource, index) => (
                      <div
                        key={resource.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                      >
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{resource.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {resource.visibility} · sort {resource.sortOrder}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {resource.url
                              ? resource.url
                              : (resource.documentId ?? "No link/document")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            disabled={index === 0}
                            onClick={() => void onMoveResource(resource.id, "up")}
                          >
                            Up
                          </Button>
                          <Button
                            variant="outline"
                            disabled={index === group.items.length - 1}
                            onClick={() => void onMoveResource(resource.id, "down")}
                          >
                            Down
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void resourceMutations.remove.mutateAsync(resource.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
