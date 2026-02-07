import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@corely/ui";
import { CrudListPageLayout } from "@/shared/crud";
import { catalogApi } from "@/lib/catalog-api";
import { catalogUomKeys } from "../queries";

export default function CatalogUomsPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: catalogUomKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listUoms({ page: 1, pageSize: 200 }),
  });

  const upsert = useMutation({
    mutationFn: () => catalogApi.upsertUom({ code, name }),
    onSuccess: async () => {
      setCode("");
      setName("");
      await queryClient.invalidateQueries({ queryKey: catalogUomKeys.all() });
    },
  });

  return (
    <CrudListPageLayout title="Units of Measure" subtitle="Manage catalog units">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className="rounded-md border border-input bg-background px-3 py-2"
              placeholder="Code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <input
              className="rounded-md border border-input bg-background px-3 py-2"
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button variant="outline" onClick={() => upsert.mutate()} disabled={!code || !name}>
              Save UOM
            </Button>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {(data?.items ?? []).map((uom) => (
                <div key={uom.id} className="rounded-md border border-border p-3 text-sm">
                  <span className="font-mono mr-2">{uom.code}</span>
                  <span>{uom.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
}
