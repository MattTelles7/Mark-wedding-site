import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { RsvpInput } from "./validation";

const defaultDatabasePath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");

const migrations = [
  {
    version: 1,
    sql: `
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

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_name TEXT NOT NULL CHECK(length(household_name) BETWEEN 2 AND 120),
        search_last_name TEXT NOT NULL CHECK(length(search_last_name) BETWEEN 2 AND 80),
        contact_email TEXT,
        contact_phone TEXT,
        is_locked INTEGER NOT NULL DEFAULT 0 CHECK(is_locked IN (0, 1)),
        submitted_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invited_guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL CHECK(length(first_name) BETWEEN 1 AND 80),
        last_name TEXT NOT NULL CHECK(length(last_name) BETWEEN 1 AND 80),
        rsvp_status TEXT NOT NULL DEFAULT 'pending'
          CHECK(rsvp_status IN ('pending', 'attending', 'declined')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_households_search_last_name
        ON households(search_last_name COLLATE NOCASE);

      CREATE INDEX IF NOT EXISTS idx_invited_guests_household
        ON invited_guests(household_id);

      INSERT OR IGNORE INTO settings (key, value)
      VALUES ('rsvps_open', 'false');
    `,
  },
] as const;

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

export type GuestStatus = "pending" | "attending" | "declined";

export type InvitedGuest = {
  id: number;
  householdId: number;
  firstName: string;
  lastName: string;
  status: GuestStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Household = {
  id: number;
  householdName: string;
  searchLastName: string;
  contactEmail: string;
  contactPhone: string;
  isLocked: boolean;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  guests: InvitedGuest[];
};

export type PublicHousehold = Pick<
  Household,
  "id" | "householdName" | "isLocked" | "submittedAt"
> & {
  guests: Array<Pick<InvitedGuest, "id" | "firstName" | "lastName" | "status">>;
};

export type HouseholdExportRow = {
  householdName: string;
  searchLastName: string;
  contactEmail: string;
  contactPhone: string;
  householdLocked: boolean;
  submittedAt: string;
  guestFirstName: string;
  guestLastName: string;
  guestStatus: GuestStatus;
  guestNotes: string;
  householdCreatedAt: string;
};

export type HouseholdResponse = {
  guestId: number;
  status: Exclude<GuestStatus, "pending">;
};

export type ConfirmHouseholdResult =
  | { success: true }
  | {
      success: false;
      code: "closed" | "not_found" | "locked" | "invalid_responses";
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

type HouseholdRow = {
  id: number;
  household_name: string;
  search_last_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_locked: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

type GuestRow = {
  id: number;
  household_id: number;
  first_name: string;
  last_name: string;
  rsvp_status: GuestStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeSearchValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function mapRsvpRow(row: RsvpRow): RsvpRecord {
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

function mapGuestRow(row: GuestRow): InvitedGuest {
  return {
    id: row.id,
    householdId: row.household_id,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.rsvp_status,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function runMigrations(db: Database.Database) {
  const currentVersion = db.pragma("user_version", {
    simple: true,
  }) as number;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    db.transaction(() => {
      db.exec(migration.sql);
      db.pragma(`user_version = ${migration.version}`);
    })();
  }
}

export class WeddingDatabase {
  private readonly db: Database.Database;

  constructor(filename = defaultDatabasePath) {
    if (filename !== ":memory:") {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
    }

    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    runMigrations(this.db);
  }

  close() {
    this.db.close();
  }

  getSchemaVersion() {
    return this.db.pragma("user_version", { simple: true }) as number;
  }

  insertLegacyRsvp(input: RsvpInput) {
    this.db
      .prepare(
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
      )
      .run(
        input.fullName,
        input.attending ? 1 : 0,
        input.guestCount,
        input.mealChoice,
        input.songRequest,
        input.message,
      );
  }

  getLegacyRsvps(): RsvpRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM rsvps ORDER BY created_at DESC, id DESC")
      .all() as RsvpRow[];

    return rows.map(mapRsvpRow);
  }

  deleteLegacyRsvp(id: number) {
    this.db.prepare("DELETE FROM rsvps WHERE id = ?").run(id);
  }

  getLegacyRsvpSummary() {
    const summary = this.db
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

  areRsvpsOpen() {
    const row = this.db
      .prepare("SELECT value FROM settings WHERE key = 'rsvps_open'")
      .get() as { value: string } | undefined;

    return row?.value === "true";
  }

  setRsvpsOpen(isOpen: boolean) {
    this.db
      .prepare(
        `
          INSERT INTO settings (key, value)
          VALUES ('rsvps_open', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `,
      )
      .run(isOpen ? "true" : "false");
  }

  createHousehold(input: {
    householdName: string;
    searchLastName: string;
    contactEmail?: string;
    contactPhone?: string;
  }) {
    const result = this.db
      .prepare(
        `
          INSERT INTO households (
            household_name,
            search_last_name,
            contact_email,
            contact_phone
          ) VALUES (?, ?, ?, ?)
        `,
      )
      .run(
        input.householdName.trim(),
        normalizeSearchValue(input.searchLastName),
        input.contactEmail?.trim() || null,
        input.contactPhone?.trim() || null,
      );

    return Number(result.lastInsertRowid);
  }

  createHouseholdWithGuests(input: {
    householdName: string;
    searchLastName: string;
    contactEmail?: string;
    contactPhone?: string;
    guests: Array<{
      firstName: string;
      lastName: string;
      status?: GuestStatus;
      notes?: string;
    }>;
  }) {
    if (input.guests.length === 0) {
      throw new Error("A household must include at least one invited person.");
    }

    return this.db
      .transaction((transactionInput: typeof input) => {
        const householdId = this.createHousehold(transactionInput);
        for (const guest of transactionInput.guests) {
          this.createGuest(householdId, guest);
        }
        return householdId;
      })
      .immediate(input);
  }

  updateHousehold(
    id: number,
    input: {
      householdName: string;
      searchLastName: string;
      contactEmail?: string;
      contactPhone?: string;
    },
  ) {
    const result = this.db
      .prepare(
        `
          UPDATE households
          SET
            household_name = ?,
            search_last_name = ?,
            contact_email = ?,
            contact_phone = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .run(
        input.householdName.trim(),
        normalizeSearchValue(input.searchLastName),
        input.contactEmail?.trim() || null,
        input.contactPhone?.trim() || null,
        id,
      );
    return result.changes > 0;
  }

  deleteHousehold(id: number) {
    this.db.prepare("DELETE FROM households WHERE id = ?").run(id);
  }

  createGuest(
    householdId: number,
    input: {
      firstName: string;
      lastName: string;
      status?: GuestStatus;
      notes?: string;
    },
  ) {
    const result = this.db
      .prepare(
        `
          INSERT INTO invited_guests (
            household_id,
            first_name,
            last_name,
            rsvp_status,
            notes
          ) VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(
        householdId,
        input.firstName.trim(),
        input.lastName.trim(),
        input.status ?? "pending",
        input.notes?.trim() || null,
      );

    this.touchHousehold(householdId);
    return Number(result.lastInsertRowid);
  }

  updateGuest(
    id: number,
    input: {
      firstName: string;
      lastName: string;
      status: GuestStatus;
      notes?: string;
    },
  ) {
    const existing = this.db
      .prepare("SELECT household_id FROM invited_guests WHERE id = ?")
      .get(id) as { household_id: number } | undefined;

    if (!existing) {
      return false;
    }

    this.db
      .prepare(
        `
          UPDATE invited_guests
          SET
            first_name = ?,
            last_name = ?,
            rsvp_status = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .run(
        input.firstName.trim(),
        input.lastName.trim(),
        input.status,
        input.notes?.trim() || null,
        id,
      );

    this.touchHousehold(existing.household_id);
    return true;
  }

  deleteGuest(id: number) {
    return this.db
      .transaction((guestId: number) => {
        const existing = this.db
          .prepare("SELECT household_id FROM invited_guests WHERE id = ?")
          .get(guestId) as { household_id: number } | undefined;
        if (!existing) {
          return false;
        }

        const count = this.db
          .prepare(
            "SELECT COUNT(*) AS count FROM invited_guests WHERE household_id = ?",
          )
          .get(existing.household_id) as { count: number };
        if (count.count <= 1) {
          return false;
        }

        this.db.prepare("DELETE FROM invited_guests WHERE id = ?").run(guestId);
        this.touchHousehold(existing.household_id);
        return true;
      })
      .immediate(id);
  }

  setHouseholdLocked(id: number, isLocked: boolean) {
    this.db
      .prepare(
        `
          UPDATE households
          SET
            is_locked = ?,
            submitted_at = CASE
              WHEN ? = 1 THEN COALESCE(submitted_at, CURRENT_TIMESTAMP)
              ELSE NULL
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .run(isLocked ? 1 : 0, isLocked ? 1 : 0, id);
  }

  getHouseholds(filter = ""): Household[] {
    const normalizedFilter = filter.trim();
    const rows = this.db
      .prepare(
        `
          SELECT h.*
          FROM households h
          WHERE
            @filter = ''
            OR h.household_name LIKE @pattern
            OR h.search_last_name LIKE @pattern
            OR EXISTS (
              SELECT 1
              FROM invited_guests g
              WHERE
                g.household_id = h.id
                AND (g.first_name LIKE @pattern OR g.last_name LIKE @pattern)
            )
          ORDER BY h.household_name COLLATE NOCASE, h.id
        `,
      )
      .all({
        filter: normalizedFilter,
        pattern: `%${normalizedFilter}%`,
      }) as HouseholdRow[];

    const guestStatement = this.db.prepare(
      `
        SELECT *
        FROM invited_guests
        WHERE household_id = ?
        ORDER BY id
      `,
    );

    return rows.map((row) => ({
      id: row.id,
      householdName: row.household_name,
      searchLastName: row.search_last_name,
      contactEmail: row.contact_email ?? "",
      contactPhone: row.contact_phone ?? "",
      isLocked: row.is_locked === 1,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      guests: (guestStatement.all(row.id) as GuestRow[]).map(mapGuestRow),
    }));
  }

  searchPublicHouseholds(lastName: string): PublicHousehold[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM households
          WHERE search_last_name = ? COLLATE NOCASE
          ORDER BY household_name COLLATE NOCASE, id
          LIMIT 10
        `,
      )
      .all(normalizeSearchValue(lastName)) as HouseholdRow[];

    const guestStatement = this.db.prepare(
      `
        SELECT *
        FROM invited_guests
        WHERE household_id = ?
        ORDER BY id
      `,
    );

    return rows.map((row) => ({
      id: row.id,
      householdName: row.household_name,
      isLocked: row.is_locked === 1,
      submittedAt: row.submitted_at,
      guests: (guestStatement.all(row.id) as GuestRow[]).map((guest) => ({
        id: guest.id,
        firstName: guest.first_name,
        lastName: guest.last_name,
        status: guest.rsvp_status,
      })),
    }));
  }

  confirmHousehold(
    householdId: number,
    responses: HouseholdResponse[],
  ): ConfirmHouseholdResult {
    const confirm = this.db.transaction((): ConfirmHouseholdResult => {
      if (!this.areRsvpsOpen()) {
        return { success: false, code: "closed" };
      }

      const household = this.db
        .prepare("SELECT is_locked FROM households WHERE id = ?")
        .get(householdId) as { is_locked: number } | undefined;

      if (!household) {
        return { success: false, code: "not_found" };
      }

      if (household.is_locked === 1) {
        return { success: false, code: "locked" };
      }

      const authoritativeGuests = this.db
        .prepare(
          "SELECT id FROM invited_guests WHERE household_id = ? ORDER BY id",
        )
        .all(householdId) as Array<{ id: number }>;
      const expectedIds = authoritativeGuests.map((guest) => guest.id);
      const responseIds = responses.map((response) => response.guestId);
      const uniqueResponseIds = new Set(responseIds);
      const responsesAreValid =
        expectedIds.length > 0 &&
        expectedIds.length === responses.length &&
        uniqueResponseIds.size === responses.length &&
        expectedIds.every((id) => uniqueResponseIds.has(id)) &&
        responses.every(
          (response) =>
            response.status === "attending" || response.status === "declined",
        );

      if (!responsesAreValid) {
        return { success: false, code: "invalid_responses" };
      }

      const updateGuest = this.db.prepare(
        `
          UPDATE invited_guests
          SET rsvp_status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND household_id = ?
        `,
      );

      for (const response of responses) {
        updateGuest.run(response.status, response.guestId, householdId);
      }

      const lockResult = this.db
        .prepare(
          `
            UPDATE households
            SET
              is_locked = 1,
              submitted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND is_locked = 0
          `,
        )
        .run(householdId);

      return lockResult.changes === 1
        ? { success: true }
        : { success: false, code: "locked" };
    });

    return confirm.immediate();
  }

  getHouseholdSummary() {
    const guestCounts = this.db
      .prepare(
        `
          SELECT
            COUNT(*) AS total_invited,
            COALESCE(SUM(CASE WHEN rsvp_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN rsvp_status = 'attending' THEN 1 ELSE 0 END), 0) AS attending,
            COALESCE(SUM(CASE WHEN rsvp_status = 'declined' THEN 1 ELSE 0 END), 0) AS declined
          FROM invited_guests
        `,
      )
      .get() as {
      total_invited: number;
      pending: number;
      attending: number;
      declined: number;
    };
    const householdCounts = this.db
      .prepare(
        `
          SELECT
            COUNT(*) AS total_households,
            COALESCE(SUM(is_locked), 0) AS locked_households
          FROM households
        `,
      )
      .get() as {
      total_households: number;
      locked_households: number;
    };

    return {
      totalInvited: guestCounts.total_invited,
      pending: guestCounts.pending,
      attending: guestCounts.attending,
      declined: guestCounts.declined,
      lockedHouseholds: householdCounts.locked_households,
      totalHouseholds: householdCounts.total_households,
    };
  }

  getHouseholdExportRows(): HouseholdExportRow[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            h.household_name,
            h.search_last_name,
            h.contact_email,
            h.contact_phone,
            h.is_locked,
            h.submitted_at,
            h.created_at AS household_created_at,
            g.first_name,
            g.last_name,
            g.rsvp_status,
            g.notes
          FROM households h
          LEFT JOIN invited_guests g ON g.household_id = h.id
          ORDER BY h.household_name COLLATE NOCASE, h.id, g.id
        `,
      )
      .all() as Array<{
      household_name: string;
      search_last_name: string;
      contact_email: string | null;
      contact_phone: string | null;
      is_locked: number;
      submitted_at: string | null;
      household_created_at: string;
      first_name: string | null;
      last_name: string | null;
      rsvp_status: GuestStatus | null;
      notes: string | null;
    }>;

    return rows.map((row) => ({
      householdName: row.household_name,
      searchLastName: row.search_last_name,
      contactEmail: row.contact_email ?? "",
      contactPhone: row.contact_phone ?? "",
      householdLocked: row.is_locked === 1,
      submittedAt: row.submitted_at ?? "",
      guestFirstName: row.first_name ?? "",
      guestLastName: row.last_name ?? "",
      guestStatus: row.rsvp_status ?? "pending",
      guestNotes: row.notes ?? "",
      householdCreatedAt: row.household_created_at,
    }));
  }

  private touchHousehold(id: number) {
    this.db
      .prepare(
        "UPDATE households SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(id);
  }
}

let productionDatabase: WeddingDatabase | undefined;

function getProductionDatabase() {
  productionDatabase ??= new WeddingDatabase();
  return productionDatabase;
}

export function insertRsvp(input: RsvpInput) {
  getProductionDatabase().insertLegacyRsvp(input);
}

export function getRsvps() {
  return getProductionDatabase().getLegacyRsvps();
}

export function deleteRsvp(id: number) {
  getProductionDatabase().deleteLegacyRsvp(id);
}

export function getRsvpSummary() {
  return getProductionDatabase().getLegacyRsvpSummary();
}

export function areRsvpsOpen() {
  return getProductionDatabase().areRsvpsOpen();
}

export function setRsvpsOpen(isOpen: boolean) {
  getProductionDatabase().setRsvpsOpen(isOpen);
}

export function createHousehold(
  input: Parameters<WeddingDatabase["createHousehold"]>[0],
) {
  return getProductionDatabase().createHousehold(input);
}

export function createHouseholdWithGuests(
  input: Parameters<WeddingDatabase["createHouseholdWithGuests"]>[0],
) {
  return getProductionDatabase().createHouseholdWithGuests(input);
}

export function updateHousehold(
  id: number,
  input: Parameters<WeddingDatabase["updateHousehold"]>[1],
) {
  return getProductionDatabase().updateHousehold(id, input);
}

export function deleteHousehold(id: number) {
  getProductionDatabase().deleteHousehold(id);
}

export function createGuest(
  householdId: number,
  input: Parameters<WeddingDatabase["createGuest"]>[1],
) {
  return getProductionDatabase().createGuest(householdId, input);
}

export function updateGuest(
  id: number,
  input: Parameters<WeddingDatabase["updateGuest"]>[1],
) {
  return getProductionDatabase().updateGuest(id, input);
}

export function deleteGuest(id: number) {
  return getProductionDatabase().deleteGuest(id);
}

export function setHouseholdLocked(id: number, isLocked: boolean) {
  getProductionDatabase().setHouseholdLocked(id, isLocked);
}

export function getHouseholds(filter = "") {
  return getProductionDatabase().getHouseholds(filter);
}

export function searchPublicHouseholds(lastName: string) {
  return getProductionDatabase().searchPublicHouseholds(lastName);
}

export function confirmHousehold(
  householdId: number,
  responses: HouseholdResponse[],
) {
  return getProductionDatabase().confirmHousehold(householdId, responses);
}

export function getHouseholdSummary() {
  return getProductionDatabase().getHouseholdSummary();
}

export function getHouseholdExportRows() {
  return getProductionDatabase().getHouseholdExportRows();
}
