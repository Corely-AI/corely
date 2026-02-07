import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, UserMinus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import { ConfirmDeleteDialog } from "@/shared/crud";
import { withWorkspace } from "@/shared/workspaces/workspace-query-keys";
import {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCreateCustomerInput,
  type CustomerFormData,
} from "../schemas/customer-form.schema";

type StudentGuardiansPanelProps = {
  studentId: string;
};

const guardiansKey = (studentId: string) => withWorkspace(["students", studentId, "guardians"]);

export default function StudentGuardiansPanel({ studentId }: StudentGuardiansPanelProps) {
  const queryClient = useQueryClient();
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedGuardianId, setSelectedGuardianId] = React.useState("");
  const [isPrimaryPayer, setIsPrimaryPayer] = React.useState(false);
  const [isPrimaryContact, setIsPrimaryContact] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const customersOptionsKey = withWorkspace(["customers", "options"]);

  const { data: guardiansData, isLoading: guardiansLoading } = useQuery({
    queryKey: guardiansKey(studentId),
    queryFn: () => customersApi.listStudentGuardians(studentId),
    enabled: Boolean(studentId),
  });

  const { data: customersData } = useQuery({
    queryKey: customersOptionsKey,
    queryFn: () => customersApi.listCustomers({ pageSize: 200 }),
  });

  const createGuardianForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
  });

  React.useEffect(() => {
    if (!createOpen) {
      createGuardianForm.reset(getDefaultCustomerFormValues());
    }
  }, [createOpen, createGuardianForm]);

  const guardians = guardiansData?.guardians ?? [];
  const linkedGuardianIds = new Set(guardians.map((item) => item.guardian.id));
  const availableGuardians =
    customersData?.customers.filter(
      (customer) => customer.id !== studentId && !linkedGuardianIds.has(customer.id)
    ) ?? [];
  const hasPrimaryPayer = guardians.some((guardian) => guardian.isPrimaryPayer);

  const invalidateGuardians = async () => {
    await queryClient.invalidateQueries({ queryKey: guardiansKey(studentId) });
  };

  const linkGuardian = useMutation({
    mutationFn: async () => {
      if (!selectedGuardianId) {
        throw new Error("Select a guardian");
      }
      return customersApi.linkGuardian(studentId, {
        guardianClientId: selectedGuardianId,
        isPrimaryPayer,
        isPrimaryContact,
      });
    },
    onSuccess: async () => {
      setLinkOpen(false);
      setSelectedGuardianId("");
      setIsPrimaryPayer(false);
      setIsPrimaryContact(false);
      await invalidateGuardians();
    },
  });

  const createGuardianMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const input = {
        ...toCreateCustomerInput(data),
        role: "GUARDIAN" as const,
      };
      return customersApi.createCustomer(input);
    },
    onSuccess: async (guardian) => {
      if (!guardian?.id) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: customersOptionsKey });
      setSelectedGuardianId(guardian.id);
      setCreateOpen(false);
      setLinkOpen(true);
    },
  });

  const setPrimaryPayerMutation = useMutation({
    mutationFn: async (guardianClientId: string) =>
      customersApi.setPrimaryPayer(studentId, { guardianClientId }),
    onSuccess: invalidateGuardians,
  });

  const unlinkGuardianMutation = useMutation({
    mutationFn: async (guardianClientId: string) =>
      customersApi.unlinkGuardian(studentId, guardianClientId),
    onSuccess: async () => {
      setDeleteTarget(null);
      await invalidateGuardians();
    },
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Guardians</div>
            <div className="text-xs text-muted-foreground">
              Link parents or guardians and set the billing payer.
            </div>
          </div>
          <Button variant="outline" onClick={() => setLinkOpen(true)}>
            <Plus className="h-4 w-4" />
            Link guardian
          </Button>
        </div>

        {!guardiansLoading && guardians.length > 0 && !hasPrimaryPayer && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            Primary payer missing — billing will be blocked.
          </div>
        )}

        {guardiansLoading ? (
          <div className="text-sm text-muted-foreground">Loading guardians...</div>
        ) : guardians.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No guardians linked yet. Add one to manage billing responsibility.
          </div>
        ) : (
          <div className="space-y-3">
            {guardians.map((entry) => (
              <div
                key={entry.guardian.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">{entry.guardian.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.guardian.email || entry.guardian.phone || "No contact details"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.isPrimaryPayer && <Badge>Primary payer</Badge>}
                    {entry.isPrimaryContact && <Badge variant="outline">Primary contact</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrimaryPayerMutation.mutate(entry.guardian.id)}
                    disabled={entry.isPrimaryPayer || setPrimaryPayerMutation.isPending}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Set primary payer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(entry.guardian.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                    Unlink
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          trigger={null}
          title="Unlink guardian"
          description="This will remove the guardian from the student."
          isLoading={unlinkGuardianMutation.isPending}
          onConfirm={() => {
            if (!deleteTarget) {
              return;
            }
            unlinkGuardianMutation.mutate(deleteTarget);
          }}
        />

        <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Link guardian</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Guardian</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2"
                    onClick={() => {
                      setLinkOpen(false);
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Add new
                  </Button>
                </div>
                <Select value={selectedGuardianId} onValueChange={setSelectedGuardianId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select guardian" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGuardians.map((guardian) => (
                      <SelectItem key={guardian.id} value={guardian.id}>
                        {guardian.displayName || guardian.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableGuardians.length === 0 && (
                  <div className="text-xs text-muted-foreground">No available clients to link.</div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guardian-primary-payer"
                    checked={isPrimaryPayer}
                    onCheckedChange={(checked) => setIsPrimaryPayer(Boolean(checked))}
                  />
                  <Label htmlFor="guardian-primary-payer">Primary payer</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guardian-primary-contact"
                    checked={isPrimaryContact}
                    onCheckedChange={(checked) => setIsPrimaryContact(Boolean(checked))}
                  />
                  <Label htmlFor="guardian-primary-contact">Primary contact</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                onClick={() => linkGuardian.mutate()}
                disabled={!selectedGuardianId || linkGuardian.isPending}
              >
                {linkGuardian.isPending ? "Linking..." : "Link guardian"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setLinkOpen(true);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add guardian</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={createGuardianForm.handleSubmit((data) =>
                createGuardianMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="guardian-displayName">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guardian-displayName"
                  {...createGuardianForm.register("displayName")}
                  placeholder="Guardian name"
                />
                {createGuardianForm.formState.errors.displayName && (
                  <p className="text-sm text-destructive">
                    {createGuardianForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardian-email">Email</Label>
                  <Input
                    id="guardian-email"
                    type="email"
                    {...createGuardianForm.register("email")}
                    placeholder="name@example.com"
                  />
                  {createGuardianForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {createGuardianForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian-phone">Phone</Label>
                  <Input
                    id="guardian-phone"
                    type="tel"
                    {...createGuardianForm.register("phone")}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    setLinkOpen(true);
                  }}
                  disabled={createGuardianMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" disabled={createGuardianMutation.isPending}>
                  {createGuardianMutation.isPending ? "Creating..." : "Create guardian"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
