import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/shared/ui/drawer";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { rentalsApi } from "@/lib/rentals-api";
import { rentalCategoryKeys } from "../queries";
import { toast } from "sonner";
import { EmptyState } from "@/shared/components/EmptyState";
import { ConfirmDeleteDialog, CrudListPageLayout, CrudRowActions } from "@/shared/crud";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

export default function RentalCategoriesPage() {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: rentalCategoryKeys.list(),
    queryFn: () => rentalsApi.listCategories(),
  });

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const openCreate = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setIsDrawerOpen(true);
  };

  const openEdit = (category: any) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setSlugTouched(true);
    setIsDrawerOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name, slug };
      if (editingCategory) {
        return rentalsApi.updateCategory(editingCategory.id, payload);
      }
      return rentalsApi.createCategory(payload);
    },
    onSuccess: () => {
      toast.success(editingCategory ? "Category updated" : "Category created");
      void queryClient.invalidateQueries({ queryKey: ["rentals/categories"] });
      setIsDrawerOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rentalsApi.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      void queryClient.invalidateQueries({ queryKey: ["rentals/categories"] });
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    },
  });

  return (
    <>
      <CrudListPageLayout
        title="Rental Categories"
        subtitle="Manage categories for your properties"
        primaryAction={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        }
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading categories...</div>
            ) : categories.length === 0 ? (
              <EmptyState
                title="No categories"
                description="Create your first category to organize your properties."
                action={<Button onClick={openCreate}>Add Category</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Name
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Slug
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr
                        key={category.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium">{category.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{category.slug}</td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{
                              label: "Edit",
                              onClick: () => openEdit(category),
                            }}
                            secondaryActions={[
                              {
                                label: "Delete",
                                onClick: () => setDeleteId(category.id),
                                destructive: true,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </CrudListPageLayout>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>{editingCategory ? "Edit Category" : "New Category"}</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Luxury"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="luxury"
                />
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {editingCategory ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
      />
    </>
  );
}
