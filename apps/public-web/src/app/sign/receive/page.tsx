import { getSignRecipientLanguage } from "@corely/web-shared/shared/i18n/sign-recipient";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { RecipientForm } from "./recipient-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Review and sign",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};
export default async function Receive() {
  if (
    process.env.NODE_ENV === "production" &&
    !/^\/source\/corely-sign-[a-f0-9]{40}\.zip$/.test(process.env.NEXT_PUBLIC_SIGN_SOURCE_URL ?? "")
  ) {
    notFound();
  }
  const language = getSignRecipientLanguage((await headers()).get("accept-language"));
  return <RecipientForm {...language} />;
}
