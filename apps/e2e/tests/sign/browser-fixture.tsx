import "../../../../packages/web-shared/src/shared/i18n";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WorkspaceTemplates } from "../../../../packages/web-features/src/modules/sign/template-page";
import { RequestActions } from "../../../../packages/web-features/src/modules/sign/request-actions";
import type { SignRequestDraft } from "@corely/contracts";
import "../../../../apps/web/src/index.css";
const path = window.location.pathname;
const edit = /^\/sign\/templates\/([^/]+)\/edit$/.exec(path);
const confirmationDraft: SignRequestDraft = {
  requestId: "10000000-0000-4000-8000-000000000002",
  templateId: "10000000-0000-4000-8000-000000000003",
  templateRevision: 1,
  title: "Sample signing request",
  canonicalSha256: "a".repeat(64),
  routing: "parallel",
  recipients: [{ roleId: "signer", name: "Jamie Example", email: "jamie@example.test" }],
  status: "DRAFT",
};
createRoot(document.querySelector("#root")!).render(
  <BrowserRouter>
    {path === "/sign/requests/confirmation-fixture" ? (
      <main className="space-y-4 p-4 sm:p-6">
        <h1 className="text-h1">{confirmationDraft.title}</h1>
        <p>Revision 1 · Parallel</p>
        <ol className="list-inside list-decimal rounded border p-4">
          {confirmationDraft.recipients.map((recipient) => (
            <li key={recipient.roleId}>
              {recipient.name} ({recipient.email})
            </li>
          ))}
        </ol>
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
