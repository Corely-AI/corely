import { getSignRecipientLanguage } from "@corely/web-shared/shared/i18n/sign-recipient";
import { headers } from "next/headers";
import { RecipientForm } from "./recipient-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Review and sign",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};
export default async function Receive() {
  const language = getSignRecipientLanguage((await headers()).get("accept-language"));
  return <RecipientForm {...language} />;
}
