import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { portfolioApi } from "@/lib/portfolio-api";
import { portfolioKeys } from "../queries";
import {
  serviceFormSchema,
  getDefaultServiceFormValues,
  toCreateServiceInput,
  toServiceFormValues,
  toUpdateServiceInput,
  type ServiceFormData,
} from "../schemas/service-form.schema";
import { slugify } from "../utils";
import type { PortfolioContentStatus } from "@corely/contracts";

const statusOptions: { label: string; value: PortfolioContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export default function ServiceEditorPage() {
  const { id, showcaseId: routeShowcaseId } = useParams<{ id?: string; showcaseId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: getDefaultServiceFormValues(),
  });

  const isEdit = Boolean(id);

  const { data: service, isLoading } = useQuery({
    queryKey: id ? portfolioKeys.services.detail(id) : ["portfolio", "services", "new"],
    queryFn: () => (id ? portfolioApi.getService(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const activeShowcaseId = routeShowcaseId ?? service?.showcaseId ?? null;

  useEffect(() => {
    if (!service) {
      return;
    }
    form.reset(toServiceFormValues(service));
    setSlugTouched(true);
  }, [service, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (id) {
        return portfolioApi.updateService(id, toUpdateServiceInput(data));
      }
      if (!activeShowcaseId) {
        throw new Error("Missing showcase id");
      }
      return portfolioApi.createService(activeShowcaseId, toCreateServiceInput(data));
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Service updated" : "Service created");
      if (activeShowcaseId) {
        await queryClient.invalidateQueries({ queryKey: ["portfolio", "services", "list", activeShowcaseId] });
      }
      await queryClient.invalidateQueries({ queryKey: ["portfolio", "services", saved.id] });
      if (!id) {
        navigate(`/portfolio/services/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save service");
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate(
                activeShowcaseId
                  ? `/portfolio/showcases/${activeShowcaseId}/services`
                  : "/portfolio/showcases"
              )
            }
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">
            {isEdit ? "Edit service" : "Create service"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
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
        <div className="text-sm text-muted-foreground">Loading service...</div>
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
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
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
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.slug.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="shortDescription">Short description</Label>
                <Textarea id="shortDescription" rows={3} {...form.register("shortDescription")} />
                {form.formState.errors.shortDescription && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.shortDescription.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="deliverables">Deliverables (comma separated)</Label>
                <Input id="deliverables" {...form.register("deliverables")} placeholder="Audit, UX flows" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="startingFromPrice">Starting from price</Label>
                  <Input id="startingFromPrice" {...form.register("startingFromPrice")} placeholder="$10,000" />
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort order</Label>
                  <Input id="sortOrder" type="number" {...form.register("sortOrder")} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="ctaText">CTA text</Label>
                  <Input id="ctaText" {...form.register("ctaText")} />
                </div>
                <div>
                  <Label htmlFor="ctaUrl">CTA URL</Label>
                  <Input id="ctaUrl" {...form.register("ctaUrl")} placeholder="https://..." />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.watch("status")}
                  onChange={(event) =>
                    form.setValue("status", event.target.value as ServiceFormData["status"], {
                      shouldValidate: true,
                    })
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
