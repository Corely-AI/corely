import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@corely/ui";
import { CrudListPageLayout } from "@/shared/crud";
import { catalogApi } from "@/lib/catalog-api";
import { catalogCategoryKeys } from "../queries";

export default function CatalogCategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: catalogCategoryKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listCategories({ page: 1, pageSize: 200 }),
  });

  const upsert = useMutation({
    mutationFn: () => catalogApi.upsertCategory({ name }),
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: catalogCategoryKeys.all() });
    },
  });

  return (
    <CrudListPageLayout title="Categories" subtitle="Organize catalog items into hierarchies">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className="rounded-md border border-input bg-background px-3 py-2"
              placeholder="Category name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button variant="outline" onClick={() => upsert.mutate()} disabled={!name}>
              Save Category
            </Button>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {(data?.items ?? []).map((category) => (
                <div key={category.id} className="rounded-md border border-border p-3 text-sm">
                  {category.name}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
}
