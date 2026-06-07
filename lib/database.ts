import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { RsvpInput } from "./validation";

const databasePath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL CHECK(length(full_name) BETWEEN 2 AND 120),
    attending INTEGER NOT NULL CHECK(attending IN (0, 1)),
    guest_count INTEGER NOT NULL CHECK(guest_count BETWEEN 0 AND 10),
    meal_choice TEXT NOT NULL,
    song_request TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
      (attending = 1 AND guest_count BETWEEN 1 AND 10)
      OR (attending = 0 AND guest_count = 0)
    )
  );
`);

export type RsvpRecord = {
  id: number;
  fullName: string;
  attending: boolean;
  guestCount: number;
  mealChoice: string;
  songRequest: string;
  message: string;
  createdAt: string;
};

type RsvpRow = {
  id: number;
  full_name: string;
  attending: number;
  guest_count: number;
  meal_choice: string;
  song_request: string;
  message: string;
  created_at: string;
};

function mapRow(row: RsvpRow): RsvpRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    attending: row.attending === 1,
    guestCount: row.guest_count,
    mealChoice: row.meal_choice,
    songRequest: row.song_request,
    message: row.message,
    createdAt: row.created_at,
  };
}

export function insertRsvp(input: RsvpInput) {
  db.prepare(
    `
      INSERT INTO rsvps (
        full_name,
        attending,
        guest_count,
        meal_choice,
        song_request,
        message
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(
    input.fullName,
    input.attending ? 1 : 0,
    input.guestCount,
    input.mealChoice,
    input.songRequest,
    input.message,
  );
}

export function getRsvps(): RsvpRecord[] {
  const rows = db
    .prepare("SELECT * FROM rsvps ORDER BY created_at DESC, id DESC")
    .all() as RsvpRow[];

  return rows.map(mapRow);
}

export function deleteRsvp(id: number) {
  db.prepare("DELETE FROM rsvps WHERE id = ?").run(id);
}

export function getRsvpSummary() {
  const summary = db
    .prepare(
      `
        SELECT
          COUNT(*) AS total_responses,
          COALESCE(SUM(CASE WHEN attending = 1 THEN 1 ELSE 0 END), 0) AS attending,
          COALESCE(SUM(CASE WHEN attending = 0 THEN 1 ELSE 0 END), 0) AS not_attending,
          COALESCE(SUM(guest_count), 0) AS total_guests
        FROM rsvps
      `,
    )
    .get() as {
    total_responses: number;
    attending: number;
    not_attending: number;
    total_guests: number;
  };

  return {
    totalResponses: summary.total_responses,
    attending: summary.attending,
    notAttending: summary.not_attending,
    totalGuests: summary.total_guests,
  };
}
