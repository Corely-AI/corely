import { getSignRecipientLanguage } from "@corely/web-shared/shared/i18n/sign-recipient";
import { RecipientForm } from "@corely/web-features/modules/sign/recipient-form";
import { headers } from "next/headers";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Review and sign",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};
export default async function Receive() {
  const language = await getSignRecipientLanguage((await headers()).get("accept-language"));
  return (
    <RecipientForm
      {...language}
      pdfAssets={{
        moduleUrl: "/api/signing/pdf-module?v=6.5.438",
        workerUrl: "/api/signing/pdf-worker?v=6.5.438",
      }}
    />
  );
}
