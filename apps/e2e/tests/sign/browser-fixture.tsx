import "../../../../packages/web-shared/src/shared/i18n";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WorkspaceTemplates } from "../../../../packages/web-features/src/modules/sign/template-page";
import "../../../../apps/web/src/index.css";
const path = window.location.pathname;
const edit = /^\/sign\/templates\/([^/]+)\/edit$/.exec(path);
createRoot(document.querySelector("#root")!).render(
  <BrowserRouter>
    <WorkspaceTemplates
      workspace="fixture-workspace"
      id={edit?.[1]}
      list={path === "/sign/templates"}
      requestMode={path === "/sign/requests/new"}
    />
  </BrowserRouter>
);
