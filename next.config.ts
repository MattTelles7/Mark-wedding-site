import type { NextConfig } from "next";

const defaultServerActionOrigins = [
  "wolfe-wedding.com",
  "www.wolfe-wedding.com",
];

const serverActionOrigins = (
  process.env.NEXT_SERVER_ACTION_ALLOWED_ORIGINS ||
  defaultServerActionOrigins.join(",")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["exceljs", "xlsx"],
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins,
      // The file validator enforces 10 MiB. Leave room for multipart metadata.
      bodySizeLimit: "11mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
