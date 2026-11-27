import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
// import { usePublicPortfolioContext } from "./PublicPortfolioLayout";

export const PublicShowcaseClients = () => {
  const uiCopy = useUiCopy("ui.portfolio-public-publicplaceholders");
  // const { featuredClients } = usePublicPortfolioContext();
  return (
    <div className="container py-10">
      <h1>{uiCopy("clients")}</h1>
      <p>{uiCopy("client-list-coming-soon")}</p>
    </div>
  );
};

export const PublicShowcaseServices = () => {
  const uiCopy = useUiCopy("ui.portfolio-public-publicplaceholders");
  // const { featuredServices } = usePublicPortfolioContext();
  return (
    <div className="container py-10">
      <h1>{uiCopy("services")}</h1>
      <p>{uiCopy("services-list-coming-soon")}</p>
    </div>
  );
};

export const PublicShowcaseTeam = () => {
  const uiCopy = useUiCopy("ui.portfolio-public-publicplaceholders");
  // const { featuredTeamMembers } = usePublicPortfolioContext();
  return (
    <div className="container py-10">
      <h1>{uiCopy("team")}</h1>
      <p>{uiCopy("team-list-coming-soon")}</p>
    </div>
  );
};

export const PublicShowcaseBlog = () => {
  const uiCopy = useUiCopy("ui.portfolio-public-publicplaceholders");
  return (
    <div className="container py-10">
      <h1>{uiCopy("blog")}</h1>
      <p>{uiCopy("blog-coming-soon")}</p>
    </div>
  );
};
