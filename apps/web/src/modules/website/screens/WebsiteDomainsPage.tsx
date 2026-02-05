import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import { ConfirmDeleteDialog } from "@/shared/crud";
import { websiteApi } from "@/lib/website-api";
import { websiteDomainKeys } from "../queries";
import { toast } from "sonner";

export default function WebsiteDomainsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hostname, setHostname] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const domainQueryKey = useMemo(() => websiteDomainKeys.list(siteId ?? ""), [siteId]);

  const { data } = useQuery({
    queryKey: domainQueryKey,
    queryFn: () => (siteId ? websiteApi.listDomains(siteId) : Promise.resolve({ items: [] })),
    enabled: Boolean(siteId),
  });

  const domains = data?.items ?? [];

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!siteId) {
        return;
      }
      return websiteApi.addDomain(siteId, { hostname, isPrimary });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: domainQueryKey });
      setHostname("");
      setIsPrimary(false);
      toast.success("Domain added");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add domain");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!siteId || !deleteTarget) {
        return;
      }
      return websiteApi.removeDomain(siteId, deleteTarget);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: domainQueryKey });
      setDeleteTarget(null);
      toast.success("Domain removed");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove domain");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-lg font-semibold">Domains</div>
            <div className="text-sm text-muted-foreground">Attach custom domains to this site</div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label>Hostname</Label>
              <Input
                placeholder="example.com"
                value={hostname}
                onChange={(event) => setHostname(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="accent"
                disabled={!hostname.trim() || addMutation.isPending}
                onClick={() => void addMutation.mutate()}
              >
                <Plus className="h-4 w-4" />
                Add domain
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            Set as primary
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    Hostname
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    Primary
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => (
                  <tr
                    key={domain.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{domain.hostname}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {domain.isPrimary ? "Yes" : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(domain.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {domains.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={3}>
                      No domains yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Remove domain?"
        description="This domain will no longer resolve to the site."
        confirmLabel="Remove"
        onConfirm={() => void deleteMutation.mutate()}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
