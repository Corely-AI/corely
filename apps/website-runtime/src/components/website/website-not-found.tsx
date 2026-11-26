import { negotiateCorelyLocale } from "@corely/contracts";
import { headers } from "next/headers";
import messages from "./locales/website.json";
import React from "react";
import Link from "next/link";

export const WebsiteNotFound = async ({ message }: { message?: string }) => {
  const locale = negotiateCorelyLocale((await headers()).get("accept-language"));
  const copy = messages[locale];
  return (
    <div
      lang={locale}
      className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-6"
    >
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{copy.website}</div>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">{copy.notFound}</h1>
      <p className="text-muted-foreground max-w-md">{message ?? copy.notFoundDetails}</p>
      <Link
        href="/"
        className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
      >
        {copy.home}
      </Link>
    </div>
  );
};
