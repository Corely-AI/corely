import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
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
  const uiCopy = useUiCopy("ui.portfolio-showcaseprofilepage");
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
      toast.success(uiCopy("profile-updated"));
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
            <h1 className="text-h1 text-foreground">{uiCopy("profile")}</h1>
            <p className="text-sm text-muted-foreground">
              {showcase?.name ?? uiCopy("showcase-profile")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/portfolio/showcases")}>
            {uiCopy("back-to-showcases")}
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? uiCopy("saving") : uiCopy("save-profile")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">{uiCopy("loading-profile")}</div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-8 space-y-6">
              <div>
                <Label htmlFor="introLine">{uiCopy("intro-line")}</Label>
                <Input
                  id="introLine"
                  {...form.register("introLine")}
                  placeholder={uiCopy("hi-i-m")}
                />
              </div>
              <div>
                <Label htmlFor="headline">{uiCopy("headline")}</Label>
                <Input
                  id="headline"
                  {...form.register("headline")}
                  placeholder={uiCopy("designing-product-experiences")}
                />
              </div>
              <div>
                <Label htmlFor="subheadline">{uiCopy("subheadline")}</Label>
                <Input id="subheadline" {...form.register("subheadline")} />
              </div>
              <div>
                <Label htmlFor="aboutShort">{uiCopy("about-short")}</Label>
                <Textarea id="aboutShort" rows={3} {...form.register("aboutShort")} />
              </div>
              <div>
                <Label htmlFor="aboutLong">{uiCopy("about-long")}</Label>
                <Textarea id="aboutLong" rows={6} {...form.register("aboutLong")} />
              </div>
              <div>
                <Label htmlFor="focusBullets">{uiCopy("focus-bullets-comma-separated")}</Label>
                <Input
                  id="focusBullets"
                  {...form.register("focusBullets")}
                  placeholder={uiCopy("ai-product-strategy-ui")}
                />
              </div>
              <div>
                <Label htmlFor="ctaTitle">{uiCopy("cta-title")}</Label>
                <Input id="ctaTitle" {...form.register("ctaTitle")} />
              </div>
              <div>
                <Label htmlFor="ctaText">{uiCopy("cta-text")}</Label>
                <Textarea id="ctaText" rows={2} {...form.register("ctaText")} />
              </div>
              <div>
                <Label htmlFor="ctaUrl">{uiCopy("cta-url")}</Label>
                <Input id="ctaUrl" {...form.register("ctaUrl")} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="techStacks">{uiCopy("tech-stacks-comma-separated")}</Label>
                <Input
                  id="techStacks"
                  {...form.register("techStacks")}
                  placeholder={uiCopy("figma-react-tailwind")}
                />
              </div>
              <div>
                <Label htmlFor="socialLinks">{uiCopy("social-links-json")}</Label>
                <Textarea
                  id="socialLinks"
                  rows={3}
                  {...form.register("socialLinks")}
                  placeholder={uiCopy("linkedin-https")}
                />
              </div>
              <div>
                <Label htmlFor="homeSections">{uiCopy("home-sections-comma-separated")}</Label>
                <Input
                  id="homeSections"
                  {...form.register("homeSections")}
                  placeholder={uiCopy("works-services-clients-blog")}
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
                <Label htmlFor="isPublished">{uiCopy("published")}</Label>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
