import { headers } from "next/headers";

export async function getRequestIp() {
  const requestHeaders = await headers();
  const trustProxyHeaders = process.env.TRUST_PROXY_HEADERS === "true";

  if (!trustProxyHeaders) {
    return "single-client";
  }

  return (
    requestHeaders.get("cf-connecting-ip") ||
    requestHeaders.get("x-real-ip") ||
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
