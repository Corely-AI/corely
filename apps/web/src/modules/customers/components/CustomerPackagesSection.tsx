import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TableLoadingSkeleton,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@corely/ui";
import { toast } from "sonner";
import type { CustomerPackage } from "@corely/contracts";
import { engagementApi } from "@/lib/engagement-api";
import { workspaceQueryKeys } from "@/shared/workspaces/workspace-query-keys";

type Props = {
  customerId: string;
};

const createUuid = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const formatLocalDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString();
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const statusVariant = (status: CustomerPackage["status"]): "outline" | "accent" => {
  return status === "ACTIVE" ? "accent" : "outline";
};

export default function CustomerPackagesSection({ customerId }: Props) {
  const uiCopy = useUiCopy("ui.customers-customerpackagessection");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [consumeTarget, setConsumeTarget] = React.useState<CustomerPackage | null>(null);

  const [packageName, setPackageName] = React.useState("");
  const [packageTotalUnits, setPackageTotalUnits] = React.useState("1");
  const [packageExpiry, setPackageExpiry] = React.useState("");
  const [packageNotes, setPackageNotes] = React.useState("");

  const [consumeUnits, setConsumeUnits] = React.useState("1");
  const [consumeNotes, setConsumeNotes] = React.useState("");

  const packagesQuery = useQuery({
    queryKey: workspaceQueryKeys.engagementPackages.list({ customerId, includeInactive: true }),
    queryFn: () =>
      engagementApi.listCustomerPackages({
        customerPartyId: customerId,
        includeInactive: true,
        pageSize: 50,
      }),
    enabled: Boolean(customerId),
  });

  const packages = packagesQuery.data?.items ?? [];
  const selectedPackageId =
    consumeTarget?.customerPackageId ?? packages[0]?.customerPackageId ?? null;

  const usageQuery = useQuery({
    queryKey: workspaceQueryKeys.engagementPackageUsage.list({
      customerPackageId: selectedPackageId,
    }),
    queryFn: () => {
      if (!selectedPackageId) {
        return Promise.resolve({ items: [], nextCursor: null });
      }
      return engagementApi.listPackageUsage(selectedPackageId, { pageSize: 20 });
    },
    enabled: Boolean(selectedPackageId),
  });

  const createPackageMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      totalUnits: number;
      expiresOn: string | null;
      notes: string | null;
    }) =>
      engagementApi.createCustomerPackage({
        customerPackageId: createUuid(),
        customerPartyId: customerId,
        name: payload.name,
        totalUnits: payload.totalUnits,
        expiresOn: payload.expiresOn,
        notes: payload.notes,
        createdByEmployeePartyId: null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.engagementPackages.all(),
      });
      toast.success(uiCopy("package-created"));
      setCreateOpen(false);
      setPackageName("");
      setPackageTotalUnits("1");
      setPackageExpiry("");
      setPackageNotes("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to create package";
      toast.error(message);
    },
  });

  const consumeMutation = useMutation({
    mutationFn: async (payload: {
      customerPackageId: string;
      unitsUsed: number;
      notes: string | null;
    }) =>
      engagementApi.consumeCustomerPackage(payload.customerPackageId, {
        usageId: createUuid(),
        unitsUsed: payload.unitsUsed,
        notes: payload.notes,
        sourceType: "MANUAL",
        sourceId: null,
        createdByEmployeePartyId: null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.engagementPackages.all() }),
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.engagementPackageUsage.all(),
        }),
      ]);
      toast.success(uiCopy("package-usage-recorded"));
      setConsumeTarget(null);
      setConsumeUnits("1");
      setConsumeNotes("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to consume package units";
      toast.error(message);
    },
  });

  const usageItems = usageQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{uiCopy("packages")}</CardTitle>
          <p className="text-sm text-muted-foreground">{uiCopy("manage-prepaid-packages-and")}</p>
        </div>
        <Button variant="accent" onClick={() => setCreateOpen(true)}>
          {uiCopy("create-package")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            {uiCopy("customer-packages")}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiCopy("name")}</TableHead>
                <TableHead>{uiCopy("status")}</TableHead>
                <TableHead>{uiCopy("total")}</TableHead>
                <TableHead>{uiCopy("remaining")}</TableHead>
                <TableHead>{uiCopy("expiry")}</TableHead>
                <TableHead className="text-right">{uiCopy("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packagesQuery.isLoading ? (
                <TableLoadingSkeleton columns={6} label={uiCopy("loading-packages")} />
              ) : packagesQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive">
                    {uiCopy("failed-to-load-packages")}
                  </TableCell>
                </TableRow>
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {uiCopy("no-packages-yet")}
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.customerPackageId}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(pkg.status)}>{pkg.status}</Badge>
                    </TableCell>
                    <TableCell>{pkg.totalUnits}</TableCell>
                    <TableCell>{pkg.remainingUnits}</TableCell>
                    <TableCell>{formatLocalDate(pkg.expiresOn)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pkg.status !== "ACTIVE" || pkg.remainingUnits <= 0}
                        onClick={() => {
                          setConsumeTarget(pkg);
                          setConsumeUnits("1");
                          setConsumeNotes("");
                        }}
                      >
                        {uiCopy("consume-units")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">{uiCopy("package-usage")}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiCopy("used-at")}</TableHead>
                <TableHead>{uiCopy("units")}</TableHead>
                <TableHead>{uiCopy("source")}</TableHead>
                <TableHead>{uiCopy("notes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedPackageId ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {uiCopy("select-or-create-a")}
                  </TableCell>
                </TableRow>
              ) : usageQuery.isLoading ? (
                <TableLoadingSkeleton columns={4} label={uiCopy("loading-usage-history")} />
              ) : usageQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-destructive">
                    {uiCopy("failed-to-load-usage")}
                  </TableCell>
                </TableRow>
              ) : usageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {uiCopy("no-usage-records-yet")}
                  </TableCell>
                </TableRow>
              ) : (
                usageItems.map((usage) => (
                  <TableRow key={usage.usageId}>
                    <TableCell>{formatDateTime(usage.usedAt)}</TableCell>
                    <TableCell>{usage.unitsUsed}</TableCell>
                    <TableCell>{usage.sourceType ?? "-"}</TableCell>
                    <TableCell>{usage.notes ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uiCopy("create-package")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="package-name">{uiCopy("name")}</Label>
              <Input
                id="package-name"
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
                placeholder={uiCopy("10-session-package")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-total-units">{uiCopy("total-units")}</Label>
              <Input
                id="package-total-units"
                type="number"
                min={1}
                step={1}
                value={packageTotalUnits}
                onChange={(event) => setPackageTotalUnits(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-expiry">{uiCopy("expiry-date")}</Label>
              <Input
                id="package-expiry"
                type="date"
                value={packageExpiry}
                onChange={(event) => setPackageExpiry(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-notes">{uiCopy("notes")}</Label>
              <Textarea
                id="package-notes"
                value={packageNotes}
                onChange={(event) => setPackageNotes(event.target.value)}
                placeholder={uiCopy("optional-notes")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {uiCopy("cancel")}
            </Button>
            <Button
              variant="accent"
              disabled={createPackageMutation.isPending}
              onClick={() => {
                const totalUnits = Number.parseInt(packageTotalUnits, 10);
                if (!packageName.trim()) {
                  toast.error(uiCopy("package-name-is-required"));
                  return;
                }
                if (!Number.isFinite(totalUnits) || totalUnits <= 0) {
                  toast.error(uiCopy("total-units-must-be"));
                  return;
                }
                createPackageMutation.mutate({
                  name: packageName.trim(),
                  totalUnits,
                  expiresOn: packageExpiry || null,
                  notes: packageNotes.trim() ? packageNotes.trim() : null,
                });
              }}
            >
              {createPackageMutation.isPending ? uiCopy("creating") : uiCopy("create-package")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={consumeTarget !== null}
        onOpenChange={(open) => (!open ? setConsumeTarget(null) : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uiCopy("consume-package-units")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
              {consumeTarget ? (
                <>
                  <div className="font-medium text-foreground">{consumeTarget.name}</div>
                  <div>
                    {uiCopy("remaining-units") + " "}
                    {consumeTarget.remainingUnits} / {consumeTarget.totalUnits}
                  </div>
                </>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="consume-units">{uiCopy("units-to-consume")}</Label>
              <Input
                id="consume-units"
                type="number"
                min={1}
                step={1}
                value={consumeUnits}
                onChange={(event) => setConsumeUnits(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consume-notes">{uiCopy("notes")}</Label>
              <Textarea
                id="consume-notes"
                value={consumeNotes}
                onChange={(event) => setConsumeNotes(event.target.value)}
                placeholder={uiCopy("optional-notes")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConsumeTarget(null)}>
              {uiCopy("cancel")}
            </Button>
            <Button
              variant="accent"
              disabled={consumeMutation.isPending || !consumeTarget}
              onClick={() => {
                if (!consumeTarget) {
                  return;
                }
                const unitsUsed = Number.parseInt(consumeUnits, 10);
                if (!Number.isFinite(unitsUsed) || unitsUsed <= 0) {
                  toast.error(uiCopy("units-to-consume-must"));
                  return;
                }
                consumeMutation.mutate({
                  customerPackageId: consumeTarget.customerPackageId,
                  unitsUsed,
                  notes: consumeNotes.trim() ? consumeNotes.trim() : null,
                });
              }}
            >
              {consumeMutation.isPending ? uiCopy("saving") : uiCopy("consume")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
