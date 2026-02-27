import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
      toast.success("Package created");
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
      toast.success("Package usage recorded");
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
          <CardTitle>Packages</CardTitle>
          <p className="text-sm text-muted-foreground">Manage prepaid packages and usage units</p>
        </div>
        <Button variant="accent" onClick={() => setCreateOpen(true)}>
          Create package
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Customer packages</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packagesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading packages...
                  </TableCell>
                </TableRow>
              ) : packagesQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive">
                    Failed to load packages.
                  </TableCell>
                </TableRow>
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No packages yet.
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
                        Consume units
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Package usage</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Used at</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedPackageId ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Select or create a package to view usage history.
                  </TableCell>
                </TableRow>
              ) : usageQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading usage history...
                  </TableCell>
                </TableRow>
              ) : usageQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-destructive">
                    Failed to load usage history.
                  </TableCell>
                </TableRow>
              ) : usageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No usage records yet.
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
            <DialogTitle>Create package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="package-name">Name</Label>
              <Input
                id="package-name"
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
                placeholder="10-session package"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-total-units">Total units</Label>
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
              <Label htmlFor="package-expiry">Expiry date</Label>
              <Input
                id="package-expiry"
                type="date"
                value={packageExpiry}
                onChange={(event) => setPackageExpiry(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-notes">Notes</Label>
              <Textarea
                id="package-notes"
                value={packageNotes}
                onChange={(event) => setPackageNotes(event.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={createPackageMutation.isPending}
              onClick={() => {
                const totalUnits = Number.parseInt(packageTotalUnits, 10);
                if (!packageName.trim()) {
                  toast.error("Package name is required");
                  return;
                }
                if (!Number.isFinite(totalUnits) || totalUnits <= 0) {
                  toast.error("Total units must be a positive whole number");
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
              {createPackageMutation.isPending ? "Creating..." : "Create package"}
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
            <DialogTitle>Consume package units</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
              {consumeTarget ? (
                <>
                  <div className="font-medium text-foreground">{consumeTarget.name}</div>
                  <div>
                    Remaining units: {consumeTarget.remainingUnits} / {consumeTarget.totalUnits}
                  </div>
                </>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="consume-units">Units to consume</Label>
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
              <Label htmlFor="consume-notes">Notes</Label>
              <Textarea
                id="consume-notes"
                value={consumeNotes}
                onChange={(event) => setConsumeNotes(event.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConsumeTarget(null)}>
              Cancel
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
                  toast.error("Units to consume must be a positive whole number");
                  return;
                }
                consumeMutation.mutate({
                  customerPackageId: consumeTarget.customerPackageId,
                  unitsUsed,
                  notes: consumeNotes.trim() ? consumeNotes.trim() : null,
                });
              }}
            >
              {consumeMutation.isPending ? "Saving..." : "Consume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
