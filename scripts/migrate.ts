import { runMigrations } from "../lib/migrate";

runMigrations()
  .then(() => {
    console.log("All migrations complete.");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
