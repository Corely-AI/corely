import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { portfolioApi } from "@/lib/portfolio-api";
import { portfolioKeys } from "../queries";
import {
  projectFormSchema,
  getDefaultProjectFormValues,
  toCreateProjectInput,
  toProjectFormValues,
  toUpdateProjectInput,
  validateProjectPayload,
  type ProjectFormData,
} from "../schemas/project-form.schema";
import { slugify } from "../utils";
import type { PortfolioContentStatus, PortfolioProjectType } from "@corely/contracts";

const statusOptions: { label: string; value: PortfolioContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const typeOptions: { label: string; value: PortfolioProjectType }[] = [
  { label: "Startup", value: "startup" },
  { label: "Agency", value: "agency" },
  { label: "Side hustle", value: "side_hustle" },
  { label: "Open source", value: "open_source" },
  { label: "Other", value: "other" },
];

export default function ProjectEditorPage() {
  const { id, showcaseId: routeShowcaseId } = useParams<{ id?: string; showcaseId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: getDefaultProjectFormValues(),
  });

  const isEdit = Boolean(id);

  const { data: projectOutput, isLoading } = useQuery({
    queryKey: id ? portfolioKeys.projects.detail(id) : ["portfolio", "projects", "new"],
    queryFn: () => (id ? portfolioApi.getProject(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const activeShowcaseId = routeShowcaseId ?? projectOutput?.project.showcaseId ?? null;

  useEffect(() => {
    if (!projectOutput?.project) {
      return;
    }
    form.reset(toProjectFormValues(projectOutput.project, projectOutput.clientIds));
    setSlugTouched(true);
  }, [projectOutput, form]);

  const { data: clientsData } = useQuery({
    queryKey: activeShowcaseId
      ? portfolioKeys.clients.list(activeShowcaseId, { page: 1, pageSize: 100 })
      : ["portfolio", "clients", "list", "none"],
    queryFn: () =>
      activeShowcaseId
        ? portfolioApi.listClients(activeShowcaseId, { page: 1, pageSize: 100 })
        : Promise.resolve({
            items: [],
            pageInfo: { page: 1, pageSize: 100, total: 0, hasNextPage: false },
          }),
    enabled: Boolean(activeShowcaseId),
  });

  const clientOptions = clientsData?.items ?? [];

  const saveMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      if (!activeShowcaseId && !id) {
        throw new Error("Missing showcase id");
      }
      if (id) {
        const updated = await portfolioApi.updateProject(id, toUpdateProjectInput(data));
        return { projectId: updated.id, showcaseId: updated.showcaseId };
      }
      const created = await portfolioApi.createProject(
        activeShowcaseId as string,
        toCreateProjectInput(data)
      );
      return { projectId: created.id, showcaseId: created.showcaseId };
    },
    onSuccess: async ({ projectId, showcaseId }) => {
      const clientIds = form.getValues("clientIds") ?? [];
      await portfolioApi.setProjectClients(projectId, { clientIds });
      toast.success(isEdit ? "Project updated" : "Project created");
      await queryClient.invalidateQueries({
        queryKey: ["portfolio", "projects", "list", showcaseId],
      });
      await queryClient.invalidateQueries({ queryKey: ["portfolio", "projects", projectId] });
      if (!id) {
        navigate(`/portfolio/projects/${projectId}/edit`, { replace: true });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save project");
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    const validationError = validateProjectPayload(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    saveMutation.mutate(data);
  };

  const showcaseLabel = useMemo(() => {
    if (activeShowcaseId) {
      return activeShowcaseId;
    }
    return "";
  }, [activeShowcaseId]);

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
                  ? `/portfolio/showcases/${activeShowcaseId}/projects`
                  : "/portfolio/showcases"
              )
            }
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">
              {isEdit ? "Edit project" : "Create project"}
            </h1>
            {showcaseLabel ? (
              <p className="text-sm text-muted-foreground">Showcase: {showcaseLabel}</p>
            ) : null}
          </div>
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
        <div className="text-sm text-muted-foreground">Loading project...</div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-8 space-y-6">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.watch("title")}
                  onChange={(event) => {
                    const value = event.target.value;
                    form.setValue("title", value, { shouldValidate: true });
                    if (!slugTouched) {
                      form.setValue("slug", slugify(value), { shouldValidate: true });
                    }
                  }}
                  placeholder="Quik.day"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.title.message}
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
                  placeholder="quik-day"
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" rows={3} {...form.register("summary")} />
                {form.formState.errors.summary && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.summary.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" rows={6} {...form.register("content")} />
                {form.formState.errors.content && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.content.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.watch("type")}
                    onChange={(event) =>
                      form.setValue("type", event.target.value as ProjectFormData["type"], {
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
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.watch("status")}
                    onChange={(event) =>
                      form.setValue("status", event.target.value as ProjectFormData["status"], {
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
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sortOrder">Sort order</Label>
                  <Input id="sortOrder" type="number" {...form.register("sortOrder")} />
                </div>
                <div>
                  <Label htmlFor="coverImageUrl">Cover image URL</Label>
                  <Input
                    id="coverImageUrl"
                    {...form.register("coverImageUrl")}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="techStack">Tech stack (comma separated)</Label>
                <Input
                  id="techStack"
                  {...form.register("techStack")}
                  placeholder="React, Node, Prisma"
                />
              </div>
              <div>
                <Label htmlFor="links">Links (JSON)</Label>
                <Textarea
                  id="links"
                  rows={3}
                  {...form.register("links")}
                  placeholder='{"demo":"https://..."}'
                />
              </div>
              <div>
                <Label htmlFor="metrics">Metrics (JSON)</Label>
                <Textarea
                  id="metrics"
                  rows={3}
                  {...form.register("metrics")}
                  placeholder='{"teamSize":4}'
                />
              </div>
              <div>
                <Label htmlFor="clientIds">Clients</Label>
                <Controller
                  control={form.control}
                  name="clientIds"
                  render={({ field }) => (
                    <select
                      id="clientIds"
                      multiple
                      className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={field.value ?? []}
                      onChange={(event) => {
                        const selected = Array.from(event.target.selectedOptions).map(
                          (option) => option.value
                        );
                        field.onChange(selected);
                      }}
                    >
                      {clientOptions.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {clientOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    No clients available. Create clients first.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
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
                <Label htmlFor="featured">Featured project</Label>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
