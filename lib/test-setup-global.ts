// Global test setup — runs once before all tests.
// Runs database migrations so tables exist before any test file runs.
// Skips gracefully when DATABASE_URL is not configured (local dev without Postgres).
export async function setup() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[test setup] DATABASE_URL not set — skipping database migrations. Integration tests will be skipped.",
    );
    return;
  }
  const { runMigrations } = await import("./migrate");
  await runMigrations();
}
