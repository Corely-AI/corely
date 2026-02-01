import React, { useEffect } from "react";
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
  teamFormSchema,
  getDefaultTeamFormValues,
  toCreateTeamInput,
  toTeamFormValues,
  toUpdateTeamInput,
  validateTeamPayload,
  type TeamFormData,
} from "../schemas/team-form.schema";
import type { PortfolioContentStatus } from "@corely/contracts";

const statusOptions: { label: string; value: PortfolioContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export default function TeamEditorPage() {
  const { id, showcaseId: routeShowcaseId } = useParams<{ id?: string; showcaseId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: getDefaultTeamFormValues(),
  });

  const isEdit = Boolean(id);

  const { data: member, isLoading } = useQuery({
    queryKey: id ? portfolioKeys.team.detail(id) : ["portfolio", "team", "new"],
    queryFn: () => (id ? portfolioApi.getTeamMember(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const activeShowcaseId = routeShowcaseId ?? member?.showcaseId ?? null;

  useEffect(() => {
    if (!member) {
      return;
    }
    form.reset(toTeamFormValues(member));
  }, [member, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      if (id) {
        return portfolioApi.updateTeamMember(id, toUpdateTeamInput(data));
      }
      if (!activeShowcaseId) {
        throw new Error("Missing showcase id");
      }
      return portfolioApi.createTeamMember(activeShowcaseId, toCreateTeamInput(data));
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Team member updated" : "Team member created");
      if (activeShowcaseId) {
        await queryClient.invalidateQueries({
          queryKey: ["portfolio", "team", "list", activeShowcaseId],
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["portfolio", "team", saved.id] });
      if (!id) {
        navigate(`/portfolio/team/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save team member");
    },
  });

  const onSubmit = (data: TeamFormData) => {
    const validationError = validateTeamPayload(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }
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
                  ? `/portfolio/showcases/${activeShowcaseId}/team`
                  : "/portfolio/showcases"
              )
            }
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">
            {isEdit ? "Edit team member" : "Add team member"}
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
        <div className="text-sm text-muted-foreground">Loading team member...</div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-8 space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="roleTitle">Role title</Label>
                <Input id="roleTitle" {...form.register("roleTitle")} />
                {form.formState.errors.roleTitle && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.roleTitle.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} {...form.register("bio")} />
                {form.formState.errors.bio && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.bio.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="skills">Skills (comma separated)</Label>
                <Input id="skills" {...form.register("skills")} placeholder="Brand, UX, Research" />
              </div>
              <div>
                <Label htmlFor="photoUrl">Photo URL</Label>
                <Input id="photoUrl" {...form.register("photoUrl")} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="socialLinks">Social links (JSON)</Label>
                <Textarea
                  id="socialLinks"
                  rows={3}
                  {...form.register("socialLinks")}
                  placeholder='{"linkedin":"https://..."}'
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sortOrder">Sort order</Label>
                  <Input id="sortOrder" type="number" {...form.register("sortOrder")} />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.watch("status")}
                    onChange={(event) =>
                      form.setValue("status", event.target.value as TeamFormData["status"], {
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
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
