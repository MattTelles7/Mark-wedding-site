import { beforeEach, describe, expect, it } from "vitest";
import { query } from "./db";
import {
  createGuest,
  createHousehold,
  getHouseholds,
  updateGuest,
} from "./database";
import { importValidGuestRows, previewGuestImport } from "./import-service";
import type { ParsedGuestImportWorkbook } from "./import-parser";
import type { GuestImportRow } from "./import-types";

const DB_AVAILABLE = Boolean(process.env.DATABASE_URL);
const describeDb = DB_AVAILABLE ? describe : describe.skip;

beforeEach(async () => {
  if (!DB_AVAILABLE) return;
  await query(
    "TRUNCATE TABLE invited_guests, households, settings RESTART IDENTITY CASCADE",
  );
});

function row(
  overrides: Partial<GuestImportRow> & {
    rowNumber: number;
    searchLastName: string;
    firstName: string;
  },
): GuestImportRow {
  return {
    householdName: `The ${overrides.searchLastName} Family`,
    personLastName: overrides.searchLastName,
    contactEmail: "",
    contactPhone: "",
    notes: "",
    ...overrides,
  };
}

function parsed(
  rows: GuestImportRow[],
  errors: ParsedGuestImportWorkbook["errors"] = [],
): ParsedGuestImportWorkbook {
  return { rows, errors, emptyRowsIgnored: 0 };
}

describeDb("guest import service", () => {
  it("preview reports row-level validation errors", async () => {
    const result = await previewGuestImport(
      parsed(
        [],
        [
          { rowNumber: 8, message: "Missing First Name" },
          { rowNumber: 12, message: "Missing Last Name" },
        ],
      ),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.rowsRejected).toBe(2);
      expect(result.errors).toEqual([
        { rowNumber: 8, message: "Missing First Name" },
        { rowNumber: 12, message: "Missing Last Name" },
      ]);
    }
  });

  it("counts rejected rows once when a row has multiple errors", async () => {
    const result = await previewGuestImport(
      parsed(
        [],
        [
          { rowNumber: 8, message: "Missing First Name" },
          { rowNumber: 8, message: "Missing Last Name" },
        ],
      ),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.rowsRejected).toBe(1);
      expect(result.errors).toHaveLength(2);
    }
  });

  it("preview detects duplicate existing person", async () => {
    const householdId = await createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
    });
    await createGuest(householdId, {
      firstName: "Mark",
      lastName: "Wolfe",
    });

    const result = await previewGuestImport(
      parsed([
        row({ rowNumber: 2, searchLastName: "Wolfe", firstName: "Mark" }),
      ]),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.duplicateGuestsSkipped).toBe(1);
      expect(result.summary.guestsToCreate).toBe(0);
      expect(result.duplicatesSkipped[0]).toEqual({
        rowNumber: 2,
        message: "Duplicate guest already exists; skipped",
      });
    }
  });

  it("checks guests across duplicate normalized household records", async () => {
    await createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
    });
    const duplicateHouseholdId = await createHousehold({
      householdName: " the   WOLFE family ",
      searchLastName: " wolfe ",
    });
    await createGuest(duplicateHouseholdId, {
      firstName: "Mark",
      lastName: "Wolfe",
    });

    const result = await previewGuestImport(
      parsed([
        row({ rowNumber: 2, searchLastName: "Wolfe", firstName: "Mark" }),
      ]),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.existingHouseholdsMatched).toBe(1);
      expect(result.summary.guestsToCreate).toBe(0);
      expect(result.summary.duplicateGuestsSkipped).toBe(1);
    }
  });

  it("preview matches existing household by normalized Household Name and Last Name", async () => {
    await createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
    });

    const result = await previewGuestImport(
      parsed([
        row({
          rowNumber: 2,
          searchLastName: " wolfe ",
          householdName: " the   WOLFE family ",
          firstName: "Guerdithe",
          personLastName: "Nelson",
        }),
      ]),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.existingHouseholdsMatched).toBe(1);
      expect(result.summary.householdsToCreate).toBe(0);
      expect(result.summary.guestsToCreate).toBe(1);
    }
  });

  it("preview groups people with the same last name into one generated household", async () => {
    const result = await previewGuestImport(
      parsed([
        row({ rowNumber: 2, searchLastName: "Telles", firstName: "Matt" }),
        row({ rowNumber: 3, searchLastName: "Telles", firstName: "Lilly" }),
      ]),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.householdsToCreate).toBe(1);
      expect(result.summary.guestsToCreate).toBe(2);
      expect(result.householdsToCreate).toEqual([
        {
          householdKey: "the telles family::telles",
          householdName: "The Telles Family",
          searchLastName: "Telles",
          guestCount: 2,
        },
      ]);
      expect(result.guestsToCreate).toEqual([
        expect.objectContaining({
          householdKey: "the telles family::telles",
          householdName: "The Telles Family",
          firstName: "Matt",
          lastName: "Telles",
        }),
        expect.objectContaining({
          householdKey: "the telles family::telles",
          householdName: "The Telles Family",
          firstName: "Lilly",
          lastName: "Telles",
        }),
      ]);
    }
  });

  it("preview skips duplicate rows within one workbook", async () => {
    const result = await previewGuestImport(
      parsed([
        row({ rowNumber: 2, searchLastName: "Smith", firstName: "John" }),
        row({ rowNumber: 3, searchLastName: "Smith", firstName: "John" }),
      ]),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.guestsToCreate).toBe(1);
      expect(result.summary.duplicateGuestsSkipped).toBe(1);
      expect(result.duplicatesSkipped[0]).toEqual({
        rowNumber: 3,
        message: "Duplicate guest repeated in file; skipped",
      });
    }
  });

  it("final import creates new household and guests", async () => {
    const result = await importValidGuestRows(
      parsed([
        row({ rowNumber: 2, searchLastName: "Wolfe", firstName: "Amy" }),
        row({ rowNumber: 3, searchLastName: "Wolfe", firstName: "Jeremy" }),
      ]),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.householdsCreated).toBe(1);
      expect(result.summary.guestsCreated).toBe(2);
    }

    const households = await getHouseholds();
    expect(households).toHaveLength(1);
    expect(households[0]).toMatchObject({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
      isLocked: false,
      submittedAt: null,
    });
    expect(households[0].guests.map((guest) => guest.firstName)).toEqual([
      "Amy",
      "Jeremy",
    ]);
    expect(households[0].guests.map((guest) => guest.status)).toEqual([
      "pending",
      "pending",
    ]);
  });

  it("final import adds missing people without updating existing household or guest data", async () => {
    const householdId = await createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
      contactEmail: "old@example.com",
      contactPhone: "555-0000",
    });
    const guestId = await createGuest(householdId, {
      firstName: "Mark",
      lastName: "Wolfe",
      notes: "Original note",
    });
    await updateGuest(guestId, {
      firstName: "Mark",
      lastName: "Wolfe",
      status: "attending",
      notes: "Original note",
    });

    const result = await importValidGuestRows(
      parsed([
        row({
          rowNumber: 2,
          searchLastName: "Wolfe",
          firstName: "Mark",
          contactEmail: "new@example.com",
          contactPhone: "555-9999",
          notes: "Should not overwrite",
        }),
        row({
          rowNumber: 3,
          searchLastName: "Wolfe",
          firstName: "Guerdithe",
          personLastName: "Nelson",
          contactEmail: "new@example.com",
          notes: "New person note",
        }),
      ]),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.householdsCreated).toBe(0);
      expect(result.summary.guestsCreated).toBe(1);
      expect(result.summary.duplicateGuestsSkipped).toBe(1);
    }

    const [household] = await getHouseholds();
    expect(household).toMatchObject({
      contactEmail: "old@example.com",
      contactPhone: "555-0000",
    });
    expect(household.guests).toHaveLength(2);
    expect(
      household.guests.find((guest) => guest.firstName === "Mark"),
    ).toMatchObject({
      status: "attending",
      notes: "Original note",
    });
    expect(
      household.guests.find((guest) => guest.firstName === "Guerdithe"),
    ).toMatchObject({
      lastName: "Nelson",
      status: "pending",
      notes: "New person note",
    });
  });

  it("final import never deletes existing households or guests", async () => {
    const householdId = await createHousehold({
      householdName: "The Existing Family",
      searchLastName: "Existing",
    });
    await createGuest(householdId, {
      firstName: "Existing",
      lastName: "Guest",
    });

    await importValidGuestRows(
      parsed([
        row({ rowNumber: 2, searchLastName: "New", firstName: "Person" }),
      ]),
    );

    const households = await getHouseholds();
    expect(
      households.map((household) => household.householdName).sort(),
    ).toEqual(["The Existing Family", "The New Family"]);
    expect(
      households.find(
        (household) => household.householdName === "The Existing Family",
      )?.guests,
    ).toHaveLength(1);
  });

  it("skips every guest when the same workbook is imported twice", async () => {
    const workbookRows = parsed([
      row({ rowNumber: 2, searchLastName: "Wolfe", firstName: "Amy" }),
      row({ rowNumber: 3, searchLastName: "Wolfe", firstName: "Jeremy" }),
    ]);

    const firstResult = await importValidGuestRows(workbookRows);
    const secondResult = await importValidGuestRows(workbookRows);

    expect(firstResult.success).toBe(true);
    expect(secondResult.success).toBe(true);
    if (secondResult.success) {
      expect(secondResult.summary.householdsCreated).toBe(0);
      expect(secondResult.summary.guestsCreated).toBe(0);
      expect(secondResult.summary.duplicateGuestsSkipped).toBe(2);
    }

    const households = await getHouseholds();
    expect(households).toHaveLength(1);
    expect(households[0].guests).toHaveLength(2);
  });

  it("rolls back the full import when an unexpected insert fails", async () => {
    await expect(
      importValidGuestRows(
        parsed([
          row({ rowNumber: 2, searchLastName: "Valid", firstName: "Person" }),
          row({
            rowNumber: 3,
            searchLastName: "Broken",
            firstName: "x".repeat(81),
          }),
        ]),
      ),
    ).rejects.toThrow();

    expect(await getHouseholds()).toEqual([]);
  });
});
