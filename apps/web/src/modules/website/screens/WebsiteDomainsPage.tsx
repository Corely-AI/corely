import { useTranslation } from "react-i18next";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { TableLoadingSkeleton, Button, Card, CardContent, Input, Label } from "@corely/ui";
import { ConfirmDeleteDialog } from "@/shared/crud";
import { websiteApi } from "@/lib/website-api";
import { websiteDomainKeys } from "../queries";
import { toast } from "sonner";

export default function WebsiteDomainsPage() {
  const { t } = useTranslation();
  const uiCopy = useUiCopy("ui.website-websitedomainspage");
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hostname, setHostname] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const domainQueryKey = useMemo(() => websiteDomainKeys.list(siteId ?? ""), [siteId]);

  const {
    data,
    isLoading: domainsLoading,
    isError: domainsError,
  } = useQuery({
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
      toast.success(uiCopy("domain-added"));
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
      toast.success(uiCopy("domain-removed"));
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
            {uiCopy("back")}
          </Button>
          <div>
            <div className="text-lg font-semibold">{uiCopy("domains")}</div>
            <div className="text-sm text-muted-foreground">
              {uiCopy("attach-custom-domains-to")}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label>{uiCopy("hostname")}</Label>
              <Input
                placeholder={uiCopy("example-com")}
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
                {uiCopy("add-domain")}
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            {uiCopy("set-as-primary")}
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
                    {uiCopy("hostname")}
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {uiCopy("primary")}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {domainsLoading ? (
                  <TableLoadingSkeleton columns={3} label={t("common.loading")} />
                ) : domainsError && !data ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-sm text-destructive">
                      <p role="alert">{t("common.error")}</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {domains.map((domain) => (
                      <tr
                        key={domain.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium">{domain.hostname}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {domain.isPrimary ? uiCopy("yes") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(domain.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {domains.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={3}>
                          {uiCopy("no-domains-yet")}
                        </td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={uiCopy("remove-domain")}
        description={uiCopy("this-domain-will-no")}
        confirmLabel="Remove"
        onConfirm={() => void deleteMutation.mutate()}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
