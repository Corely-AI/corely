import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@corely/ui";
import { CrudListPageLayout } from "@/shared/crud";
import { catalogApi } from "@/lib/catalog-api";
import { catalogTaxProfileKeys } from "../queries";

export default function CatalogTaxProfilesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [vatRateBps, setVatRateBps] = useState("1900");

  const { data, isLoading } = useQuery({
    queryKey: catalogTaxProfileKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listTaxProfiles({ page: 1, pageSize: 200 }),
  });

  const upsert = useMutation({
    mutationFn: () =>
      catalogApi.upsertTaxProfile({
        name,
        vatRateBps: Number(vatRateBps),
        isExciseApplicable: false,
      }),
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: catalogTaxProfileKeys.all() });
    },
  });

  return (
    <CrudListPageLayout title="Tax Profiles" subtitle="Configure VAT and excise defaults">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className="rounded-md border border-input bg-background px-3 py-2"
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              className="rounded-md border border-input bg-background px-3 py-2"
              placeholder="VAT bps"
              value={vatRateBps}
              onChange={(event) => setVatRateBps(event.target.value)}
            />
            <Button variant="outline" onClick={() => upsert.mutate()} disabled={!name}>
              Save Tax Profile
            </Button>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {(data?.items ?? []).map((taxProfile) => (
                <div key={taxProfile.id} className="rounded-md border border-border p-3 text-sm">
                  <span className="font-medium">{taxProfile.name}</span>
                  <span className="ml-2 text-muted-foreground">
                    VAT {taxProfile.vatRateBps} bps
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
}
