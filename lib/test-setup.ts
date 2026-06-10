// Per-test setup — truncates tables before each test so tests are isolated.
// Skips gracefully when DATABASE_URL is not configured.
import { afterEach } from "vitest";

afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("./db");
  await query(
    "TRUNCATE TABLE invited_guests, households, settings, legacy_rsvps RESTART IDENTITY CASCADE",
  );
});
