import type { PoolClient } from "pg";
import { query, withTransaction } from "./db";
import type { ParsedGuestImportWorkbook } from "./import-parser";
import {
  guestImportKey,
  householdImportKey,
  type GuestImportActionResult,
  type GuestImportIssue,
  type GuestImportPreview,
  type GuestImportRow,
  type GuestImportSummary,
  type GuestImportWarning,
} from "./import-types";

type ImportGuest = {
  firstName: string;
  lastName: string;
};

type ExistingHousehold = {
  id: number;
  householdName: string;
  searchLastName: string;
  guests: ImportGuest[];
};

type HouseholdGroup = {
  householdKey: string;
  householdName: string;
  searchLastName: string;
  contactEmail: string;
  contactPhone: string;
  existingHousehold?: ExistingHousehold;
  guestKeysInImport: Set<string>;
  guestsToCreate: GuestImportRow[];
};

type GuestImportPlan = {
  groups: HouseholdGroup[];
  duplicatesSkipped: GuestImportWarning[];
  warnings: GuestImportWarning[];
  errors: GuestImportIssue[];
};

type ImportHouseholdRow = {
  id: string;
  household_name: string;
  search_last_name: string;
  g_first_name: string | null;
  g_last_name: string | null;
};

function blankSummary(): GuestImportSummary {
  return {
    householdsToCreate: 0,
    householdsCreated: 0,
    existingHouseholdsMatched: 0,
    guestsToCreate: 0,
    guestsCreated: 0,
    duplicateGuestsSkipped: 0,
    rowsRejected: 0,
    warnings: 0,
  };
}

function rowWarning(rowNumber: number, message: string): GuestImportWarning {
  return { rowNumber, message };
}

async function loadExistingHouseholds(
  client?: PoolClient,
): Promise<ExistingHousehold[]> {
  const sql = `
    SELECT
      h.id,
      h.household_name,
      h.search_last_name,
      g.first_name AS g_first_name,
      g.last_name AS g_last_name
    FROM households h
    LEFT JOIN invited_guests g ON g.household_id = h.id
    ORDER BY h.id, g.id
  `;
  const rows = client
    ? (await client.query<ImportHouseholdRow>(sql)).rows
    : await query<ImportHouseholdRow>(sql);

  const households = new Map<number, ExistingHousehold>();
  for (const row of rows) {
    const householdId = Number(row.id);
    if (!households.has(householdId)) {
      households.set(householdId, {
        id: householdId,
        householdName: row.household_name,
        searchLastName: row.search_last_name,
        guests: [],
      });
    }
    if (row.g_first_name && row.g_last_name) {
      households.get(householdId)!.guests.push({
        firstName: row.g_first_name,
        lastName: row.g_last_name,
      });
    }
  }
  return Array.from(households.values());
}

function buildImportPlan(
  rows: GuestImportRow[],
  existingHouseholds: ExistingHousehold[],
  errors: GuestImportIssue[],
): GuestImportPlan {
  const existingByHouseholdKey = new Map<string, ExistingHousehold>();
  const existingGuestKeys = new Map<string, Set<string>>();
  for (const household of existingHouseholds) {
    const key = householdImportKey(
      household.householdName,
      household.searchLastName,
    );
    if (!existingByHouseholdKey.has(key)) {
      existingByHouseholdKey.set(key, household);
    }
    existingGuestKeys.set(
      key,
      new Set(
        household.guests.map((guest) =>
          guestImportKey(guest.firstName, guest.lastName),
        ),
      ),
    );
  }

  const groups = new Map<string, HouseholdGroup>();
  const warnings: GuestImportWarning[] = [];
  const duplicatesSkipped: GuestImportWarning[] = [];

  for (const row of rows) {
    const householdKey = householdImportKey(
      row.householdName,
      row.searchLastName,
    );
    let group = groups.get(householdKey);
    if (!group) {
      group = {
        householdKey,
        householdName: row.householdName,
        searchLastName: row.searchLastName,
        contactEmail: "",
        contactPhone: "",
        existingHousehold: existingByHouseholdKey.get(householdKey),
        guestKeysInImport: new Set<string>(),
        guestsToCreate: [],
      };
      groups.set(householdKey, group);
    }

    if (row.contactEmail) {
      if (!group.contactEmail) {
        group.contactEmail = row.contactEmail;
      } else if (group.contactEmail !== row.contactEmail) {
        warnings.push(
          rowWarning(
            row.rowNumber,
            `Contact Email conflicts for ${group.householdName}; using first non-empty value.`,
          ),
        );
      }
    }
    if (row.contactPhone) {
      if (!group.contactPhone) {
        group.contactPhone = row.contactPhone;
      } else if (group.contactPhone !== row.contactPhone) {
        warnings.push(
          rowWarning(
            row.rowNumber,
            `Contact Phone conflicts for ${group.householdName}; using first non-empty value.`,
          ),
        );
      }
    }

    const guestKey = guestImportKey(row.firstName, row.personLastName);
    if (existingGuestKeys.get(householdKey)?.has(guestKey)) {
      duplicatesSkipped.push(
        rowWarning(row.rowNumber, "Duplicate guest already exists; skipped"),
      );
      continue;
    }
    if (group.guestKeysInImport.has(guestKey)) {
      duplicatesSkipped.push(
        rowWarning(row.rowNumber, "Duplicate guest repeated in file; skipped"),
      );
      continue;
    }

    group.guestKeysInImport.add(guestKey);
    group.guestsToCreate.push(row);
  }

  return {
    groups: Array.from(groups.values()),
    duplicatesSkipped,
    warnings,
    errors,
  };
}

function previewFromPlan(
  plan: GuestImportPlan,
  created: { householdsCreated: number; guestsCreated: number } = {
    householdsCreated: 0,
    guestsCreated: 0,
  },
): GuestImportPreview {
  const groupsWithGuests = plan.groups.filter(
    (group) => group.guestsToCreate.length > 0,
  );
  const householdsToCreate = groupsWithGuests.filter(
    (group) => !group.existingHousehold,
  );
  const existingHouseholdsMatched = plan.groups.filter(
    (group) => group.existingHousehold,
  );
  const guestsToCreate = groupsWithGuests.flatMap((group) =>
    group.guestsToCreate.map((guest) => ({
      rowNumber: guest.rowNumber,
      householdName: group.householdName,
      firstName: guest.firstName,
      lastName: guest.personLastName,
    })),
  );

  const summary: GuestImportSummary = {
    ...blankSummary(),
    householdsToCreate: householdsToCreate.length,
    householdsCreated: created.householdsCreated,
    existingHouseholdsMatched: existingHouseholdsMatched.length,
    guestsToCreate: guestsToCreate.length,
    guestsCreated: created.guestsCreated,
    duplicateGuestsSkipped: plan.duplicatesSkipped.length,
    rowsRejected: new Set(plan.errors.map((error) => error.rowNumber)).size,
    warnings: plan.warnings.length + plan.duplicatesSkipped.length,
  };

  return {
    success: true,
    summary,
    householdsToCreate: householdsToCreate.map((group) => ({
      householdName: group.householdName,
      searchLastName: group.searchLastName,
      guestCount: group.guestsToCreate.length,
    })),
    existingHouseholdsMatched: existingHouseholdsMatched.map((group) => ({
      householdName:
        group.existingHousehold?.householdName ?? group.householdName,
      searchLastName:
        group.existingHousehold?.searchLastName ?? group.searchLastName,
      guestCount: group.guestsToCreate.length,
    })),
    guestsToCreate,
    duplicatesSkipped: plan.duplicatesSkipped,
    warnings: plan.warnings,
    errors: plan.errors,
  };
}

function parsedFailure(
  parsed: ParsedGuestImportWorkbook,
): GuestImportActionResult | undefined {
  if (!parsed.fatalError) {
    return undefined;
  }
  return {
    success: false,
    message: parsed.fatalError,
    errors: parsed.errors,
  };
}

export async function previewGuestImport(
  parsed: ParsedGuestImportWorkbook,
): Promise<GuestImportActionResult> {
  const failure = parsedFailure(parsed);
  if (failure) {
    return failure;
  }
  const existingHouseholds = await loadExistingHouseholds();
  return previewFromPlan(
    buildImportPlan(parsed.rows, existingHouseholds, parsed.errors),
  );
}

export async function importValidGuestRows(
  parsed: ParsedGuestImportWorkbook,
): Promise<GuestImportActionResult> {
  const failure = parsedFailure(parsed);
  if (failure) {
    return failure;
  }

  return withTransaction(async (client) => {
    // Serialize imports so a concurrent upload cannot race duplicate detection.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('wedding_guest_import'))",
    );
    const existingHouseholds = await loadExistingHouseholds(client);
    const plan = buildImportPlan(
      parsed.rows,
      existingHouseholds,
      parsed.errors,
    );
    let householdsCreated = 0;
    let guestsCreated = 0;

    for (const group of plan.groups) {
      if (group.guestsToCreate.length === 0) {
        continue;
      }

      let householdId = group.existingHousehold?.id;
      if (!householdId) {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO households (household_name, search_last_name, contact_email, contact_phone)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [
            group.householdName,
            group.searchLastName,
            group.contactEmail || null,
            group.contactPhone || null,
          ],
        );
        householdId = Number(rows[0].id);
        householdsCreated += 1;
      }

      for (const guest of group.guestsToCreate) {
        await client.query(
          `INSERT INTO invited_guests (household_id, first_name, last_name, rsvp_status, notes)
           VALUES ($1, $2, $3, 'pending', $4)`,
          [
            householdId,
            guest.firstName,
            guest.personLastName,
            guest.notes || null,
          ],
        );
        guestsCreated += 1;
      }
    }

    return previewFromPlan(plan, { householdsCreated, guestsCreated });
  });
}
