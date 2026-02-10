import React from "react";
import type { ResolveWebsitePublicOutput } from "@corely/contracts";
import { PublicSiteLayout } from "@/components/website/public-site-layout";
import { TemplateDefault } from "@/components/website/template-default";

export const WebsitePublicPageScreen = ({
  page,
  host,
  previewMode,
  basePath,
}: {
  page: ResolveWebsitePublicOutput;
  host?: string | null;
  previewMode?: boolean;
  basePath?: string;
}) => {
  const template = page.template?.toLowerCase() ?? "default";
  const Template = template === "default" ? TemplateDefault : TemplateDefault;

  return (
    <PublicSiteLayout menus={page.menus} host={host} previewMode={previewMode} basePath={basePath}>
      <Template payload={page.payloadJson} />
    </PublicSiteLayout>
  );
};
