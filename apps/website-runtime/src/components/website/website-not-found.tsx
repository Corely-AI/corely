import React from "react";
import Link from "next/link";

export const WebsiteNotFound = ({ message }: { message?: string }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Website</div>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground max-w-md">
        {message ?? "We could not find the page you were looking for."}
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  );
};
