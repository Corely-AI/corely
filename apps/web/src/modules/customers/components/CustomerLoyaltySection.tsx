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

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const formatSignedPoints = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

export default function CustomerLoyaltySection({ customerId }: Props) {
  const queryClient = useQueryClient();
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [redeemOpen, setRedeemOpen] = React.useState(false);
  const [adjustPoints, setAdjustPoints] = React.useState("0");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [redeemPoints, setRedeemPoints] = React.useState("1");
  const [redeemReason, setRedeemReason] = React.useState("");

  const summaryQuery = useQuery({
    queryKey: workspaceQueryKeys.engagementLoyalty.detail(customerId),
    queryFn: () => engagementApi.getLoyaltySummary(customerId),
    enabled: Boolean(customerId),
  });

  const ledgerQuery = useQuery({
    queryKey: workspaceQueryKeys.engagementLoyalty.list({ customerId, pageSize: 20 }),
    queryFn: () => engagementApi.listLoyaltyLedger(customerId, { pageSize: 20 }),
    enabled: Boolean(customerId),
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: { pointsDelta: number; reason: string | null }) =>
      engagementApi.adjustLoyaltyPoints({
        entryId: createUuid(),
        customerPartyId: customerId,
        pointsDelta: payload.pointsDelta,
        reason: payload.reason,
        createdByEmployeePartyId: null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.engagementLoyalty.all(),
      });
      toast.success("Loyalty points adjusted");
      setAdjustOpen(false);
      setAdjustPoints("0");
      setAdjustReason("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to adjust loyalty points";
      toast.error(message);
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (payload: { pointsDelta: number; reason: string | null }) =>
      engagementApi.redeemLoyaltyPoints({
        entryId: createUuid(),
        customerPartyId: customerId,
        pointsDelta: payload.pointsDelta,
        reason: payload.reason,
        sourceType: "MANUAL",
        sourceId: null,
        createdByEmployeePartyId: null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.engagementLoyalty.all(),
      });
      toast.success("Loyalty points redeemed");
      setRedeemOpen(false);
      setRedeemPoints("1");
      setRedeemReason("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to redeem loyalty points";
      toast.error(message);
    },
  });

  const account = summaryQuery.data?.account;
  const ledgerItems = ledgerQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Loyalty</CardTitle>
          <p className="text-sm text-muted-foreground">Track points balance and redemptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>
            Adjust points
          </Button>
          <Button variant="accent" onClick={() => setRedeemOpen(true)}>
            Redeem points
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaryQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading loyalty summary...</div>
        ) : summaryQuery.isError ? (
          <div className="text-sm text-destructive">Failed to load loyalty summary.</div>
        ) : account ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Balance</div>
              <div className="text-2xl font-semibold text-foreground">
                {account.currentPointsBalance}
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Lifetime earned
              </div>
              <div className="text-2xl font-semibold text-foreground">
                {account.lifetimeEarnedPoints}
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Tier</div>
              <div className="text-lg font-medium text-foreground">
                {account.tier ?? "Standard"}
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Recent transactions</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : ledgerQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-destructive">
                    Failed to load transactions.
                  </TableCell>
                </TableRow>
              ) : ledgerItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No loyalty transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                ledgerItems.map((entry) => (
                  <TableRow key={entry.entryId}>
                    <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.entryType}</Badge>
                    </TableCell>
                    <TableCell
                      className={
                        entry.pointsDelta >= 0
                          ? "font-medium text-emerald-600"
                          : "font-medium text-rose-600"
                      }
                    >
                      {formatSignedPoints(entry.pointsDelta)}
                    </TableCell>
                    <TableCell>{entry.reasonCode}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust loyalty points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjust-points">Points delta</Label>
              <Input
                id="adjust-points"
                type="number"
                step={1}
                value={adjustPoints}
                onChange={(event) => setAdjustPoints(event.target.value)}
                placeholder="Use negative number to deduct"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">Reason</Label>
              <Textarea
                id="adjust-reason"
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
                placeholder="Optional reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                const pointsDelta = Number.parseInt(adjustPoints, 10);
                if (!Number.isFinite(pointsDelta) || pointsDelta === 0) {
                  toast.error("Points delta must be a non-zero whole number");
                  return;
                }
                adjustMutation.mutate({
                  pointsDelta,
                  reason: adjustReason.trim() ? adjustReason.trim() : null,
                });
              }}
              disabled={adjustMutation.isPending}
            >
              {adjustMutation.isPending ? "Saving..." : "Apply adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem loyalty points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="redeem-points">Points to redeem</Label>
              <Input
                id="redeem-points"
                type="number"
                min={1}
                step={1}
                value={redeemPoints}
                onChange={(event) => setRedeemPoints(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redeem-reason">Reason</Label>
              <Textarea
                id="redeem-reason"
                value={redeemReason}
                onChange={(event) => setRedeemReason(event.target.value)}
                placeholder="Optional reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRedeemOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                const pointsDelta = Number.parseInt(redeemPoints, 10);
                if (!Number.isFinite(pointsDelta) || pointsDelta <= 0) {
                  toast.error("Points to redeem must be a positive whole number");
                  return;
                }
                redeemMutation.mutate({
                  pointsDelta,
                  reason: redeemReason.trim() ? redeemReason.trim() : null,
                });
              }}
              disabled={redeemMutation.isPending}
            >
              {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
