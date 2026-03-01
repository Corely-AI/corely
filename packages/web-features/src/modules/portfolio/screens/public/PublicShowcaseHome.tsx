import React from "react";
import { useTranslation } from "react-i18next";
import { usePublicPortfolioContext } from "./PublicPortfolioLayout";
import { Button } from "@corely/ui";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Link, useParams } from "react-router-dom";

export const PublicShowcaseHome = () => {
  const { showcase, profile, featuredProjects, featuredClients } = usePublicPortfolioContext();
  const { slug } = useParams<{ slug: string }>();
  const isSlugMode = Boolean(slug);
  const { t } = useTranslation();

  const buildLink = (path: string) => {
    if (isSlugMode) {
      return `/p/${slug}${path}`;
    }
    return path;
  };

  return (
    <div className="space-y-16 py-10 container">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto animate-fade-in-up">
        {profile?.introLine && (
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            {profile.introLine}
          </span>
        )}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          {profile?.headline || `${t("portfolioPublic.home.welcome")} ${showcase.name}`}
        </h1>
        {profile?.subheadline && (
          <p className="text-xl text-muted-foreground leading-relaxed">{profile.subheadline}</p>
        )}
        <div className="pt-4 flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link to={buildLink("/works")}>{t("portfolioPublic.nav.works")}</Link>
          </Button>
          <Button size="lg" variant="outline">
            {t("portfolioPublic.common.contactMe")}
          </Button>
        </div>
      </section>

      {/* About Short */}
      {profile?.aboutShort && (
        <section className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold">{t("portfolioPublic.home.about")}</h2>
          <p className="text-lg text-muted-foreground">{profile.aboutShort}</p>
        </section>
      )}

      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">
              {t("portfolioPublic.home.featuredProjects")}
            </h2>
            <Button variant="ghost" asChild>
              <Link to={buildLink("/works")}>{t("portfolioPublic.home.viewAll")} &rarr;</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProjects.map((project) => (
              <Card
                key={project.id}
                className="overflow-hidden hover:shadow-lg transition-all group border-muted"
              >
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {project.coverImageUrl ? (
                    <img
                      src={
                        project.coverImageUrl.startsWith("http")
                          ? project.coverImageUrl
                          : `/api/files/${project.coverImageUrl}/public`
                      }
                      alt={project.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.techStack?.slice(0, 3).map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <Link to={buildLink(`/works/${project.slug}`)}>
                      {t("portfolioPublic.common.viewDetails")}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Featured Clients */}
      {featuredClients.length > 0 && (
        <section className="space-y-8 pt-8">
          <h2 className="text-2xl font-bold text-center">{t("portfolioPublic.home.trustedBy")}</h2>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 opacity-80">
            {featuredClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all"
              >
                {/* Logo would go here if file ID exists */}
                <span className="font-semibold text-lg">{client.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
