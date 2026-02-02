import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { portfolioApi } from "@/lib/portfolio-api";
import { portfolioKeys } from "../queries";
import {
  showcaseFormSchema,
  getDefaultShowcaseFormValues,
  toCreateShowcaseInput,
  toShowcaseFormValues,
  toUpdateShowcaseInput,
  type ShowcaseFormData,
} from "../schemas/showcase-form.schema";
import { slugify } from "../utils";

const typeOptions = [
  { label: "Individual", value: "individual" },
  { label: "Company", value: "company" },
  { label: "Hybrid", value: "hybrid" },
];

export default function ShowcaseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<ShowcaseFormData>({
    resolver: zodResolver(showcaseFormSchema),
    defaultValues: getDefaultShowcaseFormValues(),
  });

  const isEdit = Boolean(id);

  const { data: showcase, isLoading } = useQuery({
    queryKey: id ? portfolioKeys.showcases.detail(id) : ["portfolio", "showcases", "new"],
    queryFn: () => (id ? portfolioApi.getShowcase(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!showcase) {
      return;
    }
    form.reset(toShowcaseFormValues(showcase));
    setSlugTouched(true);
  }, [showcase, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ShowcaseFormData) => {
      if (id) {
        return portfolioApi.updateShowcase(id, toUpdateShowcaseInput(data));
      }
      return portfolioApi.createShowcase(toCreateShowcaseInput(data));
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Showcase updated" : "Showcase created");
      await queryClient.invalidateQueries({ queryKey: ["portfolio", "showcases"] });
      if (!id) {
        navigate(`/portfolio/showcases/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save showcase");
    },
  });

  const onSubmit = (data: ShowcaseFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/portfolio/showcases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">
            {isEdit ? "Edit showcase" : "Create showcase"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/portfolio/showcases")}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {isLoading && isEdit ? (
        <div className="text-sm text-muted-foreground">Loading showcase...</div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-8 space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.watch("name")}
                  onChange={(event) => {
                    const value = event.target.value;
                    form.setValue("name", value, { shouldValidate: true });
                    if (!slugTouched) {
                      form.setValue("slug", slugify(value), { shouldValidate: true });
                    }
                  }}
                  placeholder="Oneway8x Studio"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.watch("slug")}
                  onChange={(event) => {
                    setSlugTouched(true);
                    form.setValue("slug", event.target.value, { shouldValidate: true });
                  }}
                  placeholder="oneway8x"
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.watch("type")}
                  onChange={(event) =>
                    form.setValue("type", event.target.value as ShowcaseFormData["type"], {
                      shouldValidate: true,
                    })
                  }
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.type && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.type.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="primaryDomain">Primary domain</Label>
                <Input
                  id="primaryDomain"
                  {...form.register("primaryDomain")}
                  placeholder="oneway8x.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  )}
                />
                <Label htmlFor="isPublished">Published</Label>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
