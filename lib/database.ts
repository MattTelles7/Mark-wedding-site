import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export type HouseholdSummary = {
  totalInvited: number;
  pending: number;
  attending: number;
  declined: number;
  lockedHouseholds: number;
  totalHouseholds: number;
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

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

type HouseholdRow = {
  id: string | number;
  household_name: string;
  search_last_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_locked: boolean;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type GuestRow = {
  id: string | number;
  household_id: string | number;
  first_name: string;
  last_name: string;
  rsvp_status: GuestStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function isoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function mapHouseholdRow(row: HouseholdRow, guests: InvitedGuest[]): Household {
  return {
    id: Number(row.id),
    householdName: row.household_name,
    searchLastName: row.search_last_name,
    contactEmail: row.contact_email ?? "",
    contactPhone: row.contact_phone ?? "",
    isLocked: row.is_locked,
    submittedAt: isoOrNull(row.submitted_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    guests,
  };
}

function mapGuestRow(row: GuestRow): InvitedGuest {
  return {
    id: Number(row.id),
    householdId: Number(row.household_id),
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.rsvp_status,
    notes: row.notes ?? "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function normalizeSearchValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function areRsvpsOpen(): Promise<boolean> {
  const row = await queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'rsvps_open'",
  );
  return row?.value === "true";
}

export async function setRsvpsOpen(isOpen: boolean): Promise<void> {
  await query(
    `INSERT INTO settings (key, value) VALUES ('rsvps_open', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [isOpen ? "true" : "false"],
  );
}

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

export async function createHousehold(input: {
  householdName: string;
  searchLastName: string;
  contactEmail?: string;
  contactPhone?: string;
}): Promise<number> {
  const rows = await query<{ id: string }>(
    `INSERT INTO households (household_name, search_last_name, contact_email, contact_phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      input.householdName.trim(),
      normalizeSearchValue(input.searchLastName),
      input.contactEmail?.trim() || null,
      input.contactPhone?.trim() || null,
    ],
  );
  return Number(rows[0].id);
}

export async function createHouseholdWithGuests(input: {
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
}): Promise<number> {
  if (input.guests.length === 0) {
    throw new Error("A household must include at least one invited person.");
  }

  return withTransaction(async (client: PoolClient) => {
    const { rows: hRows } = await client.query<{ id: string }>(
      `INSERT INTO households (household_name, search_last_name, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        input.householdName.trim(),
        normalizeSearchValue(input.searchLastName),
        input.contactEmail?.trim() || null,
        input.contactPhone?.trim() || null,
      ],
    );
    const householdId = Number(hRows[0].id);

    for (const guest of input.guests) {
      await client.query(
        `INSERT INTO invited_guests (household_id, first_name, last_name, rsvp_status, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          householdId,
          guest.firstName.trim(),
          guest.lastName.trim(),
          guest.status ?? "pending",
          guest.notes?.trim() || null,
        ],
      );
    }

    return householdId;
  });
}

export async function updateHousehold(
  id: number,
  input: {
    householdName: string;
    searchLastName: string;
    contactEmail?: string;
    contactPhone?: string;
  },
): Promise<boolean> {
  await query(
    `UPDATE households
     SET household_name = $1,
         search_last_name = $2,
         contact_email = $3,
         contact_phone = $4,
         updated_at = NOW()
     WHERE id = $5`,
    [
      input.householdName.trim(),
      normalizeSearchValue(input.searchLastName),
      input.contactEmail?.trim() || null,
      input.contactPhone?.trim() || null,
      id,
    ],
  );
  // updateHousehold always succeeds if caller has a valid ID; return true
  return true;
}

export async function deleteHousehold(id: number): Promise<void> {
  await query("DELETE FROM households WHERE id = $1", [id]);
}

export async function setHouseholdLocked(
  id: number,
  isLocked: boolean,
): Promise<void> {
  await query(
    `UPDATE households
     SET is_locked = $1,
         submitted_at = CASE
           WHEN $1 = TRUE THEN COALESCE(submitted_at, NOW())
           ELSE NULL
         END,
         updated_at = NOW()
     WHERE id = $2`,
    [isLocked, id],
  );
}

export async function getHouseholds(filter = ""): Promise<Household[]> {
  const normalizedFilter = filter.trim();
  const pattern = `%${normalizedFilter}%`;

  type JoinRow = HouseholdRow & {
    g_id: string | null;
    g_household_id: string | null;
    g_first_name: string | null;
    g_last_name: string | null;
    g_rsvp_status: GuestStatus | null;
    g_notes: string | null;
    g_created_at: Date | null;
    g_updated_at: Date | null;
  };

  const rows = await query<JoinRow>(
    `SELECT
       h.id, h.household_name, h.search_last_name, h.contact_email,
       h.contact_phone, h.is_locked, h.submitted_at, h.created_at, h.updated_at,
       g.id            AS g_id,
       g.household_id  AS g_household_id,
       g.first_name    AS g_first_name,
       g.last_name     AS g_last_name,
       g.rsvp_status   AS g_rsvp_status,
       g.notes         AS g_notes,
       g.created_at    AS g_created_at,
       g.updated_at    AS g_updated_at
     FROM households h
     LEFT JOIN invited_guests g ON g.household_id = h.id
     WHERE $1 = ''
        OR h.household_name ILIKE $2
        OR h.search_last_name ILIKE $2
        OR EXISTS (
          SELECT 1 FROM invited_guests ig
          WHERE ig.household_id = h.id
            AND (ig.first_name ILIKE $2 OR ig.last_name ILIKE $2)
        )
     ORDER BY LOWER(h.household_name), h.id, g.id`,
    [normalizedFilter, pattern],
  );

  const householdMap = new Map<number, Household>();
  for (const row of rows) {
    const hid = Number(row.id);
    if (!householdMap.has(hid)) {
      householdMap.set(hid, mapHouseholdRow(row, []));
    }
    if (row.g_id !== null) {
      householdMap.get(hid)!.guests.push(
        mapGuestRow({
          id: row.g_id,
          household_id: row.g_household_id!,
          first_name: row.g_first_name!,
          last_name: row.g_last_name!,
          rsvp_status: row.g_rsvp_status!,
          notes: row.g_notes,
          created_at: row.g_created_at!,
          updated_at: row.g_updated_at!,
        }),
      );
    }
  }
  return Array.from(householdMap.values());
}

export async function searchPublicHouseholds(
  lastName: string,
): Promise<PublicHousehold[]> {
  const normalized = normalizeSearchValue(lastName);

  type PublicJoinRow = {
    h_id: string;
    household_name: string;
    is_locked: boolean;
    submitted_at: Date | null;
    g_id: string | null;
    first_name: string | null;
    last_name: string | null;
    rsvp_status: GuestStatus | null;
  };

  const rows = await query<PublicJoinRow>(
    `WITH matched AS (
       SELECT id, household_name, is_locked, submitted_at
       FROM households
       WHERE LOWER(search_last_name) = LOWER($1)
       ORDER BY LOWER(household_name), id
       LIMIT 10
     )
     SELECT
       h.id            AS h_id,
       h.household_name,
       h.is_locked,
       h.submitted_at,
       g.id            AS g_id,
       g.first_name,
       g.last_name,
       g.rsvp_status
     FROM matched h
     LEFT JOIN invited_guests g ON g.household_id = h.id
     ORDER BY LOWER(h.household_name), h.id, g.id`,
    [normalized],
  );

  const householdMap = new Map<
    number,
    PublicHousehold & { guests: Array<PublicHousehold["guests"][number]> }
  >();

  for (const row of rows) {
    const hid = Number(row.h_id);
    if (!householdMap.has(hid)) {
      householdMap.set(hid, {
        id: hid,
        householdName: row.household_name,
        isLocked: row.is_locked,
        submittedAt: isoOrNull(row.submitted_at),
        guests: [],
      });
    }
    if (row.g_id !== null) {
      householdMap.get(hid)!.guests.push({
        id: Number(row.g_id),
        firstName: row.first_name!,
        lastName: row.last_name!,
        status: row.rsvp_status!,
      });
    }
  }
  return Array.from(householdMap.values());
}

export async function confirmHousehold(
  householdId: number,
  responses: HouseholdResponse[],
): Promise<ConfirmHouseholdResult> {
  return withTransaction(async (client: PoolClient) => {
    // Check RSVPs open first
    const settingRow = await client.query<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'rsvps_open'",
    );
    if (settingRow.rows[0]?.value !== "true") {
      return { success: false, code: "closed" };
    }

    // Lock the household row to prevent concurrent submissions
    const householdResult = await client.query<{ is_locked: boolean }>(
      "SELECT is_locked FROM households WHERE id = $1 FOR UPDATE",
      [householdId],
    );
    if (householdResult.rows.length === 0) {
      return { success: false, code: "not_found" };
    }
    if (householdResult.rows[0].is_locked) {
      return { success: false, code: "locked" };
    }

    // Verify all guests are accounted for
    const guestResult = await client.query<{ id: string }>(
      "SELECT id FROM invited_guests WHERE household_id = $1 ORDER BY id",
      [householdId],
    );
    const expectedIds = guestResult.rows.map((r) => Number(r.id));
    const responseIds = responses.map((r) => r.guestId);
    const uniqueResponseIds = new Set(responseIds);

    const responsesAreValid =
      expectedIds.length > 0 &&
      expectedIds.length === responses.length &&
      uniqueResponseIds.size === responses.length &&
      expectedIds.every((id) => uniqueResponseIds.has(id)) &&
      responses.every(
        (r) => r.status === "attending" || r.status === "declined",
      );

    if (!responsesAreValid) {
      return { success: false, code: "invalid_responses" };
    }

    for (const response of responses) {
      await client.query(
        `UPDATE invited_guests
         SET rsvp_status = $1, updated_at = NOW()
         WHERE id = $2 AND household_id = $3`,
        [response.status, response.guestId, householdId],
      );
    }

    const lockResult = await client.query(
      `UPDATE households
       SET is_locked = TRUE, submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND is_locked = FALSE`,
      [householdId],
    );

    return lockResult.rowCount === 1
      ? { success: true }
      : { success: false, code: "locked" };
  });
}

export async function getHouseholdSummary(): Promise<HouseholdSummary> {
  const guestRow = await queryOne<{
    total_invited: string;
    pending: string;
    attending: string;
    declined: string;
  }>(
    `SELECT
       COUNT(*)                                                           AS total_invited,
       COALESCE(SUM(CASE WHEN rsvp_status = 'pending'   THEN 1 ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN rsvp_status = 'attending' THEN 1 ELSE 0 END), 0) AS attending,
       COALESCE(SUM(CASE WHEN rsvp_status = 'declined'  THEN 1 ELSE 0 END), 0) AS declined
     FROM invited_guests`,
  );

  const householdRow = await queryOne<{
    total_households: string;
    locked_households: string;
  }>(
    `SELECT
       COUNT(*)                                      AS total_households,
       COALESCE(SUM(CASE WHEN is_locked THEN 1 ELSE 0 END), 0) AS locked_households
     FROM households`,
  );

  return {
    totalInvited: Number(guestRow?.total_invited ?? 0),
    pending: Number(guestRow?.pending ?? 0),
    attending: Number(guestRow?.attending ?? 0),
    declined: Number(guestRow?.declined ?? 0),
    lockedHouseholds: Number(householdRow?.locked_households ?? 0),
    totalHouseholds: Number(householdRow?.total_households ?? 0),
  };
}

export async function getHouseholdExportRows(): Promise<HouseholdExportRow[]> {
  const rows = await query<{
    household_name: string;
    search_last_name: string;
    contact_email: string | null;
    contact_phone: string | null;
    is_locked: boolean;
    submitted_at: Date | null;
    household_created_at: Date;
    first_name: string | null;
    last_name: string | null;
    rsvp_status: GuestStatus | null;
    notes: string | null;
  }>(
    `SELECT
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
     ORDER BY LOWER(h.household_name), h.id, g.id`,
  );

  return rows.map((row) => ({
    householdName: row.household_name,
    searchLastName: row.search_last_name,
    contactEmail: row.contact_email ?? "",
    contactPhone: row.contact_phone ?? "",
    householdLocked: row.is_locked,
    submittedAt: isoOrNull(row.submitted_at) ?? "",
    guestFirstName: row.first_name ?? "",
    guestLastName: row.last_name ?? "",
    guestStatus: row.rsvp_status ?? "pending",
    guestNotes: row.notes ?? "",
    householdCreatedAt: row.household_created_at.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------

export async function createGuest(
  householdId: number,
  input: {
    firstName: string;
    lastName: string;
    status?: GuestStatus;
    notes?: string;
  },
): Promise<number> {
  const rows = await query<{ id: string }>(
    `INSERT INTO invited_guests (household_id, first_name, last_name, rsvp_status, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      householdId,
      input.firstName.trim(),
      input.lastName.trim(),
      input.status ?? "pending",
      input.notes?.trim() || null,
    ],
  );
  await touchHousehold(householdId);
  return Number(rows[0].id);
}

export async function updateGuest(
  id: number,
  input: {
    firstName: string;
    lastName: string;
    status: GuestStatus;
    notes?: string;
  },
): Promise<boolean> {
  const existing = await queryOne<{ household_id: string }>(
    "SELECT household_id FROM invited_guests WHERE id = $1",
    [id],
  );
  if (!existing) return false;

  await query(
    `UPDATE invited_guests
     SET first_name = $1, last_name = $2, rsvp_status = $3, notes = $4, updated_at = NOW()
     WHERE id = $5`,
    [
      input.firstName.trim(),
      input.lastName.trim(),
      input.status,
      input.notes?.trim() || null,
      id,
    ],
  );
  await touchHousehold(Number(existing.household_id));
  return true;
}

export async function deleteGuest(id: number): Promise<boolean> {
  return withTransaction(async (client: PoolClient) => {
    const existingResult = await client.query<{ household_id: string }>(
      "SELECT household_id FROM invited_guests WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (existingResult.rows.length === 0) return false;

    const householdId = Number(existingResult.rows[0].household_id);
    const countResult = await client.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM invited_guests WHERE household_id = $1",
      [householdId],
    );
    if (Number(countResult.rows[0].count) <= 1) return false;

    await client.query("DELETE FROM invited_guests WHERE id = $1", [id]);
    await client.query(
      "UPDATE households SET updated_at = NOW() WHERE id = $1",
      [householdId],
    );
    return true;
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function touchHousehold(id: number): Promise<void> {
  await query("UPDATE households SET updated_at = NOW() WHERE id = $1", [id]);
}
