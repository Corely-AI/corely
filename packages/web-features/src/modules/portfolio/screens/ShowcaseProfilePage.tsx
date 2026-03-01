import React, { useEffect } from "react";
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
  profileFormSchema,
  getDefaultProfileFormValues,
  toProfileFormValues,
  toUpsertProfileInput,
  type ProfileFormData,
  validateProfilePayload,
} from "../schemas/profile-form.schema";

export default function ShowcaseProfilePage() {
  const { showcaseId } = useParams<{ showcaseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: getDefaultProfileFormValues(),
  });

  const { data: showcase } = useQuery({
    queryKey: showcaseId
      ? portfolioKeys.showcases.detail(showcaseId)
      : ["portfolio", "showcases", "none"],
    queryFn: () => (showcaseId ? portfolioApi.getShowcase(showcaseId) : Promise.resolve(null)),
    enabled: Boolean(showcaseId),
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: showcaseId
      ? portfolioKeys.showcases.profile(showcaseId)
      : ["portfolio", "profiles", "none"],
    queryFn: () => (showcaseId ? portfolioApi.getProfile(showcaseId) : Promise.resolve(null)),
    enabled: Boolean(showcaseId),
  });

  useEffect(() => {
    if (!profile) {
      return;
    }
    form.reset(toProfileFormValues(profile));
  }, [profile, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!showcaseId) {
        throw new Error("Missing showcase id");
      }
      return portfolioApi.upsertProfile(showcaseId, toUpsertProfileInput(data));
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      await queryClient.invalidateQueries({ queryKey: ["portfolio", "profiles"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    const validationError = validateProfilePayload(data);
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/portfolio/showcases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">Profile</h1>
            <p className="text-sm text-muted-foreground">{showcase?.name ?? "Showcase profile"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/portfolio/showcases")}>
            Back to showcases
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading profile...</div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-8 space-y-6">
              <div>
                <Label htmlFor="introLine">Intro line</Label>
                <Input id="introLine" {...form.register("introLine")} placeholder="Hi, I'm..." />
              </div>
              <div>
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  {...form.register("headline")}
                  placeholder="Designing product experiences"
                />
              </div>
              <div>
                <Label htmlFor="subheadline">Subheadline</Label>
                <Input id="subheadline" {...form.register("subheadline")} />
              </div>
              <div>
                <Label htmlFor="aboutShort">About short</Label>
                <Textarea id="aboutShort" rows={3} {...form.register("aboutShort")} />
              </div>
              <div>
                <Label htmlFor="aboutLong">About long</Label>
                <Textarea id="aboutLong" rows={6} {...form.register("aboutLong")} />
              </div>
              <div>
                <Label htmlFor="focusBullets">Focus bullets (comma separated)</Label>
                <Input
                  id="focusBullets"
                  {...form.register("focusBullets")}
                  placeholder="AI product strategy, UI systems"
                />
              </div>
              <div>
                <Label htmlFor="ctaTitle">CTA title</Label>
                <Input id="ctaTitle" {...form.register("ctaTitle")} />
              </div>
              <div>
                <Label htmlFor="ctaText">CTA text</Label>
                <Textarea id="ctaText" rows={2} {...form.register("ctaText")} />
              </div>
              <div>
                <Label htmlFor="ctaUrl">CTA URL</Label>
                <Input id="ctaUrl" {...form.register("ctaUrl")} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="techStacks">Tech stacks (comma separated)</Label>
                <Input
                  id="techStacks"
                  {...form.register("techStacks")}
                  placeholder="Figma, React, Tailwind"
                />
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
              <div>
                <Label htmlFor="homeSections">Home sections (comma separated)</Label>
                <Input
                  id="homeSections"
                  {...form.register("homeSections")}
                  placeholder="works, services, clients, blog, about"
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
