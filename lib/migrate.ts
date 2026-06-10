import { getPool } from "./db";

const migrations: Array<{ name: string; sql: string }> = [
  {
    name: "001_initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key  TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS households (
        id             BIGSERIAL PRIMARY KEY,
        household_name TEXT    NOT NULL CHECK (length(household_name) BETWEEN 2 AND 120),
        search_last_name TEXT  NOT NULL CHECK (length(search_last_name) BETWEEN 2 AND 80),
        contact_email  TEXT,
        contact_phone  TEXT,
        is_locked      BOOLEAN NOT NULL DEFAULT FALSE,
        submitted_at   TIMESTAMPTZ,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_households_search_last_name
        ON households (LOWER(search_last_name));

      CREATE TABLE IF NOT EXISTS invited_guests (
        id           BIGSERIAL PRIMARY KEY,
        household_id BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        first_name   TEXT   NOT NULL CHECK (length(first_name) BETWEEN 1 AND 80),
        last_name    TEXT   NOT NULL CHECK (length(last_name) BETWEEN 1 AND 80),
        rsvp_status  TEXT   NOT NULL DEFAULT 'pending'
                            CHECK (rsvp_status IN ('pending', 'attending', 'declined')),
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_invited_guests_household
        ON invited_guests (household_id);

      CREATE TABLE IF NOT EXISTS legacy_rsvps (
        id          BIGSERIAL PRIMARY KEY,
        full_name   TEXT    NOT NULL,
        attending   BOOLEAN NOT NULL,
        guest_count INTEGER NOT NULL,
        meal_choice TEXT    NOT NULL DEFAULT '',
        song_request TEXT   NOT NULL DEFAULT '',
        message     TEXT    NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO settings (key, value)
      VALUES ('rsvps_open', 'false')
      ON CONFLICT (key) DO NOTHING;
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of migrations) {
      const { rows } = await client.query(
        "SELECT 1 FROM migrations WHERE name = $1",
        [migration.name],
      );
      if (rows.length > 0) {
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO migrations (name) VALUES ($1)", [
          migration.name,
        ]);
        await client.query("COMMIT");
        console.log(`Migration applied: ${migration.name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
}
