import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { usePublicPortfolioContext } from "./PublicPortfolioLayout";
import { portfolioPublicApi } from "@/lib/portfolio-public-api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { Link, useParams } from "react-router-dom";
// If you have a Markdown renderer, import it. simplified for now.

export const PublicShowcaseProject = () => {
  const { showcase } = usePublicPortfolioContext();
  const { slug, projectSlug } = useParams<{ slug?: string; projectSlug?: string }>();
  const isSlugMode = Boolean(slug);
  const targetProjectSlug = projectSlug;
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["public", "portfolio", "project", showcase.slug, targetProjectSlug],
    queryFn: () => portfolioPublicApi.getProject(showcase.slug, targetProjectSlug ?? ""),
    enabled: !!targetProjectSlug,
  });

  const buildLink = (path: string) => {
    if (isSlugMode && slug) {
      return `/p/${slug}${path}`;
    }
    return path;
  };

  if (isLoading) {
    return <div className="container py-10 animate-pulse">Loading project...</div>;
  }

  if (!data) {
    return <div className="container py-10">Project not found</div>;
  }

  const { project } = data;

  return (
    <article className="container py-10 max-w-4xl mx-auto space-y-10">
      <div className="space-y-4">
        <Link
          to={buildLink("/works")}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("portfolioPublic.project.backToWorks")}
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">{project.title}</h1>
        <div className="flex flex-wrap gap-2">
          {project.techStack?.map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
      </div>

      {project.coverImageUrl && (
        <div className="aspect-video rounded-xl overflow-hidden bg-muted shadow-sm">
          <img
            src={
              project.coverImageUrl.startsWith("http")
                ? project.coverImageUrl
                : `/api/files/${project.coverImageUrl}/public`
            }
            className="w-full h-full object-cover"
            alt={project.title}
          />
        </div>
      )}

      <div className="grid md:grid-cols-[2fr_1fr] gap-10">
        <div className="prose prose-stone dark:prose-invert max-w-none">
          {/* Simple whitespace handling for now if markdown not available */}
          <div className="whitespace-pre-wrap">{project.content || project.summary}</div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-6">
            <h3 className="font-semibold">{t("portfolioPublic.project.links")}</h3>
            <div className="flex flex-col gap-3">
              {project.links?.demo && (
                <Button asChild variant="default" className="w-full justify-between">
                  <a href={project.links.demo} target="_blank" rel="noopener noreferrer">
                    {t("portfolioPublic.project.liveDemo")}{" "}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
              {project.links?.repo && (
                <Button asChild variant="outline" className="w-full justify-between">
                  <a href={project.links.repo} target="_blank" rel="noopener noreferrer">
                    {t("portfolioPublic.project.sourceCode")} <Github className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              {t("portfolioPublic.project.techStack")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {project.techStack?.map((tech) => (
                <Badge key={tech} variant="outline">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
