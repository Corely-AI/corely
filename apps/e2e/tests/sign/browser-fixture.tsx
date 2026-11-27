import "../../../../packages/web-shared/src/shared/i18n";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WorkspaceTemplates } from "../../../../packages/web-features/src/modules/sign/template-page";
import { RequestActions } from "../../../../packages/web-features/src/modules/sign/request-actions";
import { RequestDetail } from "../../../../packages/web-features/src/modules/sign/request-page";
import type { SignRequestDraft } from "@corely/contracts";
import "../../../../apps/web/src/index.css";
const path = window.location.pathname;
const edit = /^\/sign\/templates\/([^/]+)\/edit$/.exec(path);
const request = /^\/sign\/requests\/([0-9a-f-]{36})$/.exec(path);
const confirmationDraft: SignRequestDraft = {
  requestId: "10000000-0000-4000-8000-000000000002",
  templateId: "10000000-0000-4000-8000-000000000003",
  templateRevision: 1,
  title: "Sample signing request",
  canonicalSha256: "a".repeat(64),
  routing: "sequential",
  recipients: [
    { roleId: "signer", name: "Jamie Example", email: "jamie@example.test" },
    { roleId: "reviewer", name: "Avery Example", email: "avery@example.test" },
  ],
  status: "DRAFT",
};
createRoot(document.querySelector("#root")!).render(
  <BrowserRouter>
    {request ? (
      <RequestDetail id={request[1]} workspace="fixture-workspace" />
    ) : path === "/sign/requests/confirmation-fixture" ? (
      <main className="space-y-4 p-4 sm:p-6">
        <RequestActions workspace="fixture-workspace" draft={confirmationDraft} />
      </main>
    ) : (
      <WorkspaceTemplates
        workspace="fixture-workspace"
        id={edit?.[1]}
        list={path === "/sign/templates"}
        requestMode={path === "/sign/requests/new"}
      />
    )}
  </BrowserRouter>
);
