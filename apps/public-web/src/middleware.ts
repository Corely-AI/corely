import { NextResponse, type NextRequest } from "next/server";
import { resolveWorkspaceSlugFromHost } from "@/lib/tenant";
import {
  buildWebsiteRewritePath,
  isWebsiteInternalPath,
  shouldRewriteToWebsite,
} from "@/lib/website-routing";
import { isWebsiteHost } from "@/lib/website-host";

const PUBLIC_FILE = /\.[^/]+$/;

const shouldSkip = (pathname: string) => {
  if (pathname.startsWith("/_next")) {
    return true;
  }
  if (pathname.startsWith("/api")) {
    return true;
  }
  if (pathname.startsWith("/assets")) {
    return true;
  }
  if (pathname.startsWith("/favicon")) {
    return true;
  }
  if (pathname.startsWith("/fonts")) {
    return true;
  }
  if (pathname.startsWith("/.well-known")) {
    return true;
  }
  return PUBLIC_FILE.test(pathname);
};

const stripWorkspacePrefix = (pathname: string) => {
  const match = pathname.match(/^\/w\/[^/]+(\/.*)?$/);
  if (!match) {
    return pathname;
  }
  return match[1] ?? "/";
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  const forwarded = request.headers.get("x-forwarded-host");
  const rawHost = forwarded ?? request.headers.get("host") ?? "";
  const host = rawHost.split(",")[0]?.trim() ?? rawHost;

  if (!isWebsiteInternalPath(pathname)) {
    const websiteHost = await isWebsiteHost({ host });
    if (shouldRewriteToWebsite({ pathname, isWebsiteHost: websiteHost })) {
      const url = request.nextUrl.clone();
      url.pathname = buildWebsiteRewritePath(pathname);
      return NextResponse.rewrite(url);
    }
  }

  const hostSlug = resolveWorkspaceSlugFromHost(host);

  if (hostSlug) {
    if (pathname.startsWith("/w/")) {
      const url = request.nextUrl.clone();
      url.pathname = stripWorkspacePrefix(pathname);
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/w/${hostSlug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  const querySlug = request.nextUrl.searchParams.get("w");
  if (querySlug && !pathname.startsWith(`/w/${querySlug}`)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("w");
    url.pathname = `/w/${querySlug}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
