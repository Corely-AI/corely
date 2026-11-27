import { RecipientForm } from "@corely/web-features/modules/sign/recipient-form";
import { getSignRecipientLanguage } from "@corely/web-shared/shared/i18n/sign-recipient";
import moduleUrl from "pdfjs-dist/legacy/build/pdf.mjs?url";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { createRoot } from "react-dom/client";

void getSignRecipientLanguage(navigator.languages.join(",") || navigator.language).then(
  (language) => {
    document.documentElement.lang = language.lang;
    document.title = `${language.messages.reviewAndSign} | Corely`;
    createRoot(document.getElementById("root")!).render(
      <RecipientForm {...language} pdfAssets={{ moduleUrl, workerUrl }} />
    );
  }
);
