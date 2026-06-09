import { afterEach, describe, expect, it } from "vitest";
import {
  createAdminHousehold,
  saveAdminGuest,
  saveAdminHousehold,
} from "./admin-service";
import { WeddingDatabase } from "./database";

const openDatabases: WeddingDatabase[] = [];

function createDatabase() {
  const database = new WeddingDatabase(":memory:");
  openDatabases.push(database);
  return database;
}

afterEach(() => {
  for (const database of openDatabases.splice(0)) {
    database.close();
  }
});

describe("admin household persistence", () => {
  it("does not create an empty or whitespace-only household shell", () => {
    const database = createDatabase();

    const empty = createAdminHousehold(database, {
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [],
    });
    const whitespace = createAdminHousehold(database, {
      searchLastName: " ",
      householdName: " ",
      guests: [{ firstName: " ", lastName: " " }],
    });

    expect(empty.success).toBe(false);
    expect(whitespace.success).toBe(false);
    expect(database.getHouseholds()).toEqual([]);
    expect(() =>
      database.createHouseholdWithGuests({
        searchLastName: "Wolfe",
        householdName: "The Wolfe Family",
        guests: [],
      }),
    ).toThrow("at least one invited person");
  });

  it("creates the household and first invited people in one operation", () => {
    const database = createDatabase();
    const result = createAdminHousehold(database, {
      searchLastName: " Wolfe ",
      householdName: " The Wolfe Family ",
      contactEmail: " family@example.com ",
      contactPhone: " 555-0100 ",
      guests: [
        { firstName: " Mark ", lastName: " Wolfe " },
        { firstName: " Guerdithe ", lastName: " Wolfe " },
      ],
    });

    expect(result.success).toBe(true);
    const household = database.getHouseholds()[0];
    expect(household).toMatchObject({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      contactEmail: "family@example.com",
      contactPhone: "555-0100",
    });
    expect(household.guests.map((guest) => guest.firstName)).toEqual([
      "Mark",
      "Guerdithe",
    ]);
  });

  it("rolls back household creation if any invited person cannot be inserted", () => {
    const database = createDatabase();

    expect(() =>
      database.createHouseholdWithGuests({
        searchLastName: "Wolfe",
        householdName: "The Wolfe Family",
        guests: [
          { firstName: "Mark", lastName: "Wolfe" },
          { firstName: "", lastName: "Wolfe" },
        ],
      }),
    ).toThrow();
    expect(database.getHouseholds()).toEqual([]);
  });

  it("persists household, guest, status, and notes autosaves while locked", () => {
    const database = createDatabase();
    const created = createAdminHousehold(database, {
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }

    const householdId = created.data.householdId;
    const guestId = database.getHouseholds()[0].guests[0].id;
    database.setHouseholdLocked(householdId, true);

    expect(
      saveAdminHousehold(database, {
        id: householdId,
        searchLastName: "Nelson",
        householdName: "Mark and Guerdithe",
        contactEmail: "updated@example.com",
        contactPhone: "+1 (555) 010-2000 ext. 4",
      }).success,
    ).toBe(true);
    expect(
      saveAdminGuest(database, guestId, {
        firstName: "Marcus",
        lastName: "Nelson",
        status: "attending",
        notes: "Vegetarian meal",
      }).success,
    ).toBe(true);

    const household = database.getHouseholds()[0];
    expect(household.isLocked).toBe(true);
    expect(household).toMatchObject({
      searchLastName: "Nelson",
      householdName: "Mark and Guerdithe",
      contactEmail: "updated@example.com",
      contactPhone: "+1 (555) 010-2000 ext. 4",
    });
    expect(household.guests[0]).toMatchObject({
      firstName: "Marcus",
      lastName: "Nelson",
      status: "attending",
      notes: "Vegetarian meal",
    });
  });

  it("will not delete the final invited person from a household", () => {
    const database = createDatabase();
    const created = createAdminHousehold(database, {
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);

    const guestId = database.getHouseholds()[0].guests[0].id;
    expect(database.deleteGuest(guestId)).toBe(false);
    expect(database.getHouseholds()[0].guests).toHaveLength(1);
  });

  it("deletes additional people and cascades a confirmed household deletion", () => {
    const database = createDatabase();
    const created = createAdminHousehold(database, {
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [
        { firstName: "Mark", lastName: "Wolfe" },
        { firstName: "Guerdithe", lastName: "Wolfe" },
      ],
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }

    const secondGuestId = database.getHouseholds()[0].guests[1].id;
    expect(database.deleteGuest(secondGuestId)).toBe(true);
    expect(database.getHouseholds()[0].guests).toHaveLength(1);

    database.deleteHousehold(created.data.householdId);
    expect(database.getHouseholds()).toEqual([]);
  });
});
