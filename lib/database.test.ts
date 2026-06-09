import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WeddingDatabase } from "./database";

const openDatabases: WeddingDatabase[] = [];
const temporaryDirectories: string[] = [];

function createDatabase(filename = ":memory:") {
  const database = new WeddingDatabase(filename);
  openDatabases.push(database);
  return database;
}

afterEach(() => {
  for (const database of openDatabases.splice(0)) {
    database.close();
  }

  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("WeddingDatabase migrations", () => {
  it("preserves legacy RSVP rows while adding the household schema", () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "wedding-rsvp-migration-"),
    );
    temporaryDirectories.push(directory);
    const filename = path.join(directory, "app.db");
    const legacyDatabase = new Database(filename);
    legacyDatabase.exec(`
      CREATE TABLE rsvps (
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
      INSERT INTO rsvps (
        full_name,
        attending,
        guest_count,
        meal_choice
      ) VALUES ('Legacy Guest', 1, 1, 'chicken');
    `);
    legacyDatabase.close();

    const database = createDatabase(filename);

    expect(database.getSchemaVersion()).toBe(1);
    expect(database.getLegacyRsvps()).toHaveLength(1);
    expect(database.getLegacyRsvps()[0].fullName).toBe("Legacy Guest");
    expect(database.areRsvpsOpen()).toBe(false);
  });

  it("can run migrations repeatedly without changing existing data", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "wedding-rsvp-repeat-"));
    temporaryDirectories.push(directory);
    const filename = path.join(directory, "app.db");
    const first = createDatabase(filename);
    first.createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
    });
    first.close();
    openDatabases.splice(openDatabases.indexOf(first), 1);

    const reopened = createDatabase(filename);

    expect(reopened.getSchemaVersion()).toBe(1);
    expect(reopened.getHouseholds()).toHaveLength(1);
  });
});

describe("household RSVP workflow", () => {
  it("requires a complete response and locks a household atomically", () => {
    const database = createDatabase();
    const householdId = database.createHousehold({
      householdName: "The Nelson Family",
      searchLastName: "Nelson",
      contactEmail: "private@example.com",
    });
    const firstGuestId = database.createGuest(householdId, {
      firstName: "Guerdithe",
      lastName: "Nelson",
    });
    const secondGuestId = database.createGuest(householdId, {
      firstName: "Guest",
      lastName: "Nelson",
    });

    expect(
      database.confirmHousehold(householdId, [
        { guestId: firstGuestId, status: "attending" },
        { guestId: secondGuestId, status: "declined" },
      ]),
    ).toEqual({ success: false, code: "closed" });

    database.setRsvpsOpen(true);
    expect(
      database.confirmHousehold(householdId, [
        { guestId: firstGuestId, status: "attending" },
      ]),
    ).toEqual({ success: false, code: "invalid_responses" });

    let household = database.getHouseholds()[0];
    expect(household.isLocked).toBe(false);
    expect(household.guests.map((guest) => guest.status)).toEqual([
      "pending",
      "pending",
    ]);

    expect(
      database.confirmHousehold(householdId, [
        { guestId: firstGuestId, status: "attending" },
        { guestId: secondGuestId, status: "declined" },
      ]),
    ).toEqual({ success: true });

    household = database.getHouseholds()[0];
    expect(household.isLocked).toBe(true);
    expect(household.submittedAt).not.toBeNull();
    expect(household.guests.map((guest) => guest.status)).toEqual([
      "attending",
      "declined",
    ]);
    expect(
      database.confirmHousehold(householdId, [
        { guestId: firstGuestId, status: "declined" },
        { guestId: secondGuestId, status: "declined" },
      ]),
    ).toEqual({ success: false, code: "locked" });
  });

  it("uses exact normalized surname search and omits private fields", () => {
    const database = createDatabase();
    const householdId = database.createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "  Wolfe ",
      contactEmail: "private@example.com",
      contactPhone: "555-0100",
    });
    database.createGuest(householdId, {
      firstName: "Mark",
      lastName: "Wolfe",
      notes: "Private admin note",
    });

    expect(database.searchPublicHouseholds("wolf")).toEqual([]);
    const results = database.searchPublicHouseholds(" WOLFE ");

    expect(results).toHaveLength(1);
    expect(results[0].guests[0]).toEqual({
      id: expect.any(Number),
      firstName: "Mark",
      lastName: "Wolfe",
      status: "pending",
    });
    expect(results[0]).not.toHaveProperty("contactEmail");
    expect(results[0].guests[0]).not.toHaveProperty("notes");
  });

  it("reports individual and household dashboard counts", () => {
    const database = createDatabase();
    const householdId = database.createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
    });
    const firstGuestId = database.createGuest(householdId, {
      firstName: "Mark",
      lastName: "Wolfe",
    });
    database.createGuest(householdId, {
      firstName: "Guest",
      lastName: "Wolfe",
      status: "declined",
    });
    database.updateGuest(firstGuestId, {
      firstName: "Mark",
      lastName: "Wolfe",
      status: "attending",
    });
    database.setHouseholdLocked(householdId, true);

    expect(database.getHouseholdSummary()).toEqual({
      totalInvited: 2,
      pending: 0,
      attending: 1,
      declined: 1,
      lockedHouseholds: 1,
      totalHouseholds: 1,
    });
  });
});
