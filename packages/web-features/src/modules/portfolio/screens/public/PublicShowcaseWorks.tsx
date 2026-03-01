import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { usePublicPortfolioContext } from "./PublicPortfolioLayout";
import { portfolioPublicApi } from "@corely/web-shared/lib/portfolio-public-api";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Link, useParams } from "react-router-dom";

export const PublicShowcaseWorks = () => {
  const { showcase } = usePublicPortfolioContext();
  const { slug } = useParams<{ slug: string }>();
  const isSlugMode = Boolean(slug);
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["public", "portfolio", "projects", "list", showcase.slug],
    queryFn: () => portfolioPublicApi.listProjects(showcase.slug),
  });

  const buildLink = (path: string) => {
    if (isSlugMode) {
      return `/p/${slug}${path}`;
    }
    return path;
  };

  return (
    <div className="container py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("portfolioPublic.works.title")}</h1>
        <p className="text-muted-foreground">{t("portfolioPublic.works.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.items.map((project) => (
            <Link key={project.id} to={buildLink(`/works/${project.slug}`)} className="group">
              <Card className="h-full overflow-hidden hover:border-accent transition-colors">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {project.coverImageUrl && (
                    <img
                      src={
                        project.coverImageUrl.startsWith("http")
                          ? project.coverImageUrl
                          : `/api/files/${project.coverImageUrl}/public`
                      }
                      alt={project.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">{project.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack?.map((tech) => (
                      <Badge key={tech} variant="outline" className="font-normal">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
