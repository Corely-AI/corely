import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@corely/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { rentalsApi } from "@/lib/rentals-api";
import { rentalCategoryKeys } from "../queries";
import { toast } from "sonner";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

interface QuickCreateCategoryDialogProps {
  onCreated?: (categoryId: string) => void;
}

export function QuickCreateCategoryDialog({ onCreated }: QuickCreateCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const queryClient = useQueryClient();

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const createMutation = useMutation({
    mutationFn: () => rentalsApi.createCategory({ name, slug }),
    onSuccess: (newCategory) => {
      toast.success("Category created");
      void queryClient.invalidateQueries({ queryKey: ["rentals/categories"] });
      onCreated?.(newCategory.id);
      setOpen(false);
      setName("");
      setSlug("");
      setSlugTouched(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create category");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Create Category</DialogTitle>
          <DialogDescription>Add a new category for your properties.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quick-cat-name">Name</Label>
            <Input
              id="quick-cat-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Luxury"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-cat-slug">Slug</Label>
            <Input
              id="quick-cat-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="luxury"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? "Creating..." : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
