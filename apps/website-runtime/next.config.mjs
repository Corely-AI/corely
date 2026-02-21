import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const resolveApiHost = () => {
  const baseUrl =
    process.env.CORELY_API_BASE_URL ||
    process.env.PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";
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
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@corely/contracts", "@corely/api-client", "@corely/public-api-client"],
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
