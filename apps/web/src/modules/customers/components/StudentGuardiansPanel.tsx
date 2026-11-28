import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, UserMinus, Mail } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  LoadingSkeleton,
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
  const uiCopy = useUiCopy("ui.customers-studentguardianspanel");
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedGuardianId, setSelectedGuardianId] = React.useState("");
  const [isPrimaryPayer, setIsPrimaryPayer] = React.useState(false);
  const [isPrimaryContact, setIsPrimaryContact] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [facebookUrl, setFacebookUrl] = React.useState("");
  const [facebookUrlError, setFacebookUrlError] = React.useState<string | null>(null);

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
      setFacebookUrl("");
      setFacebookUrlError(null);
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
    mutationFn: async ({ data, facebook }: { data: CustomerFormData; facebook?: string }) => {
      const socialLinks = facebook
        ? [
            {
              platform: "facebook" as const,
              url: facebook,
              label: "Facebook",
              isPrimary: true,
            },
          ]
        : [];
      const input = {
        ...toCreateCustomerInput({ ...data, socialLinks }),
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

  const inviteMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/portal/invitations", data),
    onSuccess: () => toast.success(uiCopy("invitation-sent-to-portal")),
    onError: (err: any) => toast.error("Failed to send invitation: " + err.message),
  });

  const handleCreateGuardian = createGuardianForm.handleSubmit((data) => {
    const trimmedFacebook = facebookUrl.trim();
    if (trimmedFacebook) {
      try {
        const parsed = new URL(trimmedFacebook);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("invalid-protocol");
        }
      } catch {
        setFacebookUrlError("Enter a valid Facebook URL (include https://).");
        return;
      }
    }

    setFacebookUrlError(null);
    createGuardianMutation.mutate({
      data,
      facebook: trimmedFacebook || undefined,
    });
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{t("classes.students.guardians.title")}</div>
            <div className="text-xs text-muted-foreground">
              {t("classes.students.guardians.subtitle")}
            </div>
          </div>
          <Button variant="outline" onClick={() => setLinkOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("classes.students.guardians.link")}
          </Button>
        </div>

        {!guardiansLoading && guardians.length > 0 && !hasPrimaryPayer && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {uiCopy("primary-payer-missing-billing")}
          </div>
        )}

        {guardiansLoading ? (
          <LoadingSkeleton variant="list" label={uiCopy("loading-guardians")} />
        ) : guardians.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {t("classes.students.guardians.empty")}
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
                    {entry.guardian.email || entry.guardian.phone || uiCopy("no-contact-details")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.isPrimaryPayer && <Badge>{uiCopy("primary-payer")}</Badge>}
                    {entry.isPrimaryContact && (
                      <Badge variant="outline">{uiCopy("primary-contact")}</Badge>
                    )}
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
                    {uiCopy("set-primary-payer")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      inviteMutation.mutate({
                        email: entry.guardian.email || "",
                        partyId: entry.guardian.id,
                        role: "GUARDIAN",
                      })
                    }
                    disabled={!entry.guardian.email || inviteMutation.isPending}
                    title={!entry.guardian.email ? "Email required for invitation" : ""}
                  >
                    <Mail className="h-4 w-4" />
                    {uiCopy("invite")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(entry.guardian.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                    {uiCopy("unlink")}
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
          title={uiCopy("unlink-guardian")}
          description={uiCopy("this-will-remove-the")}
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
              <DialogTitle>{uiCopy("link-guardian")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{uiCopy("guardian")}</Label>
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
                    {uiCopy("add-new")}
                  </Button>
                </div>
                <Select value={selectedGuardianId} onValueChange={setSelectedGuardianId}>
                  <SelectTrigger>
                    <SelectValue placeholder={uiCopy("select-guardian")} />
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
                  <div className="text-xs text-muted-foreground">
                    {uiCopy("no-available-clients-to")}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guardian-primary-payer"
                    checked={isPrimaryPayer}
                    onCheckedChange={(checked) => setIsPrimaryPayer(Boolean(checked))}
                  />
                  <Label htmlFor="guardian-primary-payer">{uiCopy("primary-payer")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guardian-primary-contact"
                    checked={isPrimaryContact}
                    onCheckedChange={(checked) => setIsPrimaryContact(Boolean(checked))}
                  />
                  <Label htmlFor="guardian-primary-contact">{uiCopy("primary-contact")}</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="accent"
                onClick={() => linkGuardian.mutate()}
                disabled={!selectedGuardianId || linkGuardian.isPending}
              >
                {linkGuardian.isPending ? uiCopy("linking") : t("classes.students.guardians.link")}
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
              <DialogTitle>{uiCopy("add-guardian")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGuardian} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guardian-displayName">
                  {uiCopy("full-name") + " "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guardian-displayName"
                  {...createGuardianForm.register("displayName")}
                  placeholder={uiCopy("guardian-name")}
                />
                {createGuardianForm.formState.errors.displayName && (
                  <p className="text-sm text-destructive">
                    {createGuardianForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian-facebook">Facebook</Label>
                <Input
                  id="guardian-facebook"
                  type="url"
                  value={facebookUrl}
                  onChange={(event) => {
                    setFacebookUrl(event.target.value);
                    if (facebookUrlError) {
                      setFacebookUrlError(null);
                    }
                  }}
                  placeholder="https://facebook.com/username"
                />
                {facebookUrlError && <p className="text-sm text-destructive">{facebookUrlError}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardian-email">{uiCopy("email")}</Label>
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
                  <Label htmlFor="guardian-phone">{uiCopy("phone")}</Label>
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
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="accent" disabled={createGuardianMutation.isPending}>
                  {createGuardianMutation.isPending
                    ? uiCopy("creating")
                    : uiCopy("create-guardian")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
