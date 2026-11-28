import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const resolveApiHost = () => {
  const baseUrl = process.env.PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!baseUrl) {
    return null;
  }
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return null;
  }
};

const apiHost = resolveApiHost();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/sign/receive",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/api/signing/pdf-module": ["./node_modules/pdfjs-dist/legacy/build/pdf.mjs"],
    "/api/signing/pdf-worker": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs"],
  },
  transpilePackages: [
    "@corely/ui",
    "@corely/web-features",
    "@corely/web-shared",
    "@corely/contracts",
    "@corely/api-client",
    "@corely/public-api-client",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "https",
        hostname: "corely.one",
      },
      {
        protocol: "https",
        hostname: "**.corely.one",
      },
      ...(apiHost
        ? [
            {
              protocol: "https",
              hostname: apiHost,
            },
            {
              protocol: "http",
              hostname: apiHost,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
