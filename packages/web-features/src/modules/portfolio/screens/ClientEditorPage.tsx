import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { Input } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Label } from "@corely/ui";
import { Checkbox } from "@corely/ui";
import { portfolioApi } from "@corely/web-shared/lib/portfolio-api";
import { portfolioKeys } from "../queries";
import {
  clientFormSchema,
  getDefaultClientFormValues,
  toClientFormValues,
  toCreateClientInput,
  toUpdateClientInput,
  type ClientFormData,
} from "../schemas/client-form.schema";
import { slugify } from "../utils";
import type { PortfolioClientType } from "@corely/contracts";

const typeOptions: { label: string; value: PortfolioClientType }[] = [
  { label: "CTO", value: "cto" },
  { label: "Freelancer", value: "freelancer" },
  { label: "Partner", value: "partner" },
  { label: "Employer", value: "employer" },
  { label: "Other", value: "other" },
];

export default function ClientEditorPage() {
  const { id, showcaseId: routeShowcaseId } = useParams<{ id?: string; showcaseId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: getDefaultClientFormValues(),
  });

  const isEdit = Boolean(id);

  const { data: client, isLoading } = useQuery({
    queryKey: id ? portfolioKeys.clients.detail(id) : ["portfolio", "clients", "new"],
    queryFn: () => (id ? portfolioApi.getClient(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const activeShowcaseId = routeShowcaseId ?? client?.showcaseId ?? null;

  useEffect(() => {
    if (!client) {
      return;
    }
    form.reset(toClientFormValues(client));
    setSlugTouched(true);
  }, [client, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      if (id) {
        return portfolioApi.updateClient(id, toUpdateClientInput(data));
      }
      if (!activeShowcaseId) {
        throw new Error("Missing showcase id");
      }
      return portfolioApi.createClient(activeShowcaseId, toCreateClientInput(data));
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Client updated" : "Client created");
      if (activeShowcaseId) {
        await queryClient.invalidateQueries({
          queryKey: ["portfolio", "clients", "list", activeShowcaseId],
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["portfolio", "clients", saved.id] });
      if (!id) {
        navigate(`/portfolio/clients/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save client");
    },
  });

  const onSubmit = (data: ClientFormData) => {
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
                  ? `/portfolio/showcases/${activeShowcaseId}/clients`
                  : "/portfolio/showcases"
              )
            }
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">{isEdit ? "Edit client" : "Create client"}</h1>
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
        <div className="text-sm text-muted-foreground">Loading client...</div>
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
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="clientType">Client type</Label>
                <select
                  id="clientType"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.watch("clientType")}
                  onChange={(event) =>
                    form.setValue(
                      "clientType",
                      event.target.value as ClientFormData["clientType"],
                      {
                        shouldValidate: true,
                      }
                    )
                  }
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="locationText">Location</Label>
                <Input
                  id="locationText"
                  {...form.register("locationText")}
                  placeholder="Remote / San Francisco"
                />
                {form.formState.errors.locationText && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.locationText.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input
                    id="websiteUrl"
                    {...form.register("websiteUrl")}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="logoImageUrl">Logo URL</Label>
                  <Input
                    id="logoImageUrl"
                    {...form.register("logoImageUrl")}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" rows={3} {...form.register("summary")} />
              </div>
              <div>
                <Label htmlFor="testimonialQuote">Testimonial quote</Label>
                <Textarea id="testimonialQuote" rows={3} {...form.register("testimonialQuote")} />
              </div>
              <div>
                <Label htmlFor="testimonialAuthor">Testimonial author</Label>
                <Input id="testimonialAuthor" {...form.register("testimonialAuthor")} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sortOrder">Sort order</Label>
                  <Input id="sortOrder" type="number" {...form.register("sortOrder")} />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <Controller
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                    )}
                  />
                  <Label htmlFor="featured">Featured client</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
