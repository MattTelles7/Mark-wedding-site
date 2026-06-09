import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "wedding_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return secret;
}

function sign(expiresAt: string) {
  return createHmac("sha256", sessionSecret())
    .update(`admin:${expiresAt}`)
    .digest("hex");
}

export function verifyAdminPassword(candidate: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    return false;
  }

  const candidateHash = createHash("sha256").update(candidate).digest("hex");
  const configuredHash = createHash("sha256")
    .update(configuredPassword)
    .digest("hex");

  return safeEqual(candidateHash, configuredHash);
}

export async function createAdminSession() {
  const expiresAt = String(
    Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  );
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, `${expiresAt}.${sign(expiresAt)}`, {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAdminSessionValid() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;

  if (!value) {
    return false;
  }

  const [expiresAt, signature, extra] = value.split(".");
  if (!expiresAt || !signature || extra) {
    return false;
  }

  const expiresAtNumber = Number(expiresAt);
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(expiresAtNumber) ||
    expiresAtNumber <= now ||
    expiresAtNumber > now + SESSION_DURATION_SECONDS
  ) {
    return false;
  }

  try {
    return safeEqual(signature, sign(expiresAt));
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdminSessionValid())) {
    redirect("/admin/login");
  }
}
