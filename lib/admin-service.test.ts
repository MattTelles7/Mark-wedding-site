import { describe, expect, it } from "vitest";
import {
  createAdminGuest,
  createAdminHousehold,
  saveAdminGuest,
  saveAdminHousehold,
  type AdminHouseholdRepository,
} from "./admin-service";

// In-memory repository for unit testing admin service logic.
// This avoids a Postgres dependency for pure business-logic tests.
type StoredGuest = {
  id: number;
  householdId: number;
  firstName: string;
  lastName: string;
  status: "pending" | "attending" | "declined";
  notes: string;
};
type StoredHousehold = {
  id: number;
  householdName: string;
  searchLastName: string;
  contactEmail: string;
  contactPhone: string;
};

function createMemoryRepository(): AdminHouseholdRepository & {
  households: StoredHousehold[];
  guests: StoredGuest[];
} {
  let nextHouseholdId = 1;
  let nextGuestId = 1;
  const households: StoredHousehold[] = [];
  const guests: StoredGuest[] = [];

  return {
    households,
    guests,
    async createHouseholdWithGuests(input) {
      if (input.guests.length === 0) {
        throw new Error(
          "A household must include at least one invited person.",
        );
      }
      const id = nextHouseholdId++;
      households.push({
        id,
        householdName: input.householdName,
        searchLastName: input.searchLastName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      });
      for (const g of input.guests) {
        guests.push({
          id: nextGuestId++,
          householdId: id,
          firstName: g.firstName,
          lastName: g.lastName,
          status: g.status ?? "pending",
          notes: g.notes ?? "",
        });
      }
      return id;
    },
    async updateHousehold(householdId, input) {
      const h = households.find((h) => h.id === householdId);
      if (!h) return false;
      Object.assign(h, input);
      return true;
    },
    async createGuest(householdId, input) {
      const id = nextGuestId++;
      guests.push({
        id,
        householdId,
        firstName: input.firstName,
        lastName: input.lastName,
        status: input.status ?? "pending",
        notes: input.notes ?? "",
      });
      return id;
    },
    async updateGuest(guestId, input) {
      const g = guests.find((g) => g.id === guestId);
      if (!g) return false;
      Object.assign(g, input);
      return true;
    },
  };
}

describe("admin household service", () => {
  it("does not create an empty or whitespace-only household shell", async () => {
    const repository = createMemoryRepository();

    const empty = await createAdminHousehold(repository, {
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [],
    });
    const whitespace = await createAdminHousehold(repository, {
      searchLastName: " ",
      householdName: " ",
      guests: [{ firstName: " ", lastName: " " }],
    });

    expect(empty.success).toBe(false);
    expect(whitespace.success).toBe(false);
    expect(repository.households).toHaveLength(0);
  });

  it("creates the household and first invited people in one operation", async () => {
    const repository = createMemoryRepository();
    const result = await createAdminHousehold(repository, {
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
    expect(repository.households[0]).toMatchObject({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      contactEmail: "family@example.com",
      contactPhone: "555-0100",
    });
    expect(repository.guests.map((g) => g.firstName)).toEqual([
      "Mark",
      "Guerdithe",
    ]);
  });

  it("persists household, guest, status, and notes autosaves", async () => {
    const repository = createMemoryRepository();
    const created = await createAdminHousehold(repository, {
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const householdId = created.data.householdId;
    const guestId = repository.guests[0].id;

    const householdSave = await saveAdminHousehold(repository, {
      id: householdId,
      searchLastName: "Nelson",
      householdName: "Mark and Guerdithe",
      contactEmail: "updated@example.com",
      contactPhone: "+1 (555) 010-2000 ext. 4",
    });
    expect(householdSave.success).toBe(true);

    const guestSave = await saveAdminGuest(repository, guestId, {
      firstName: "Marcus",
      lastName: "Nelson",
      status: "attending",
      notes: "Vegetarian meal",
    });
    expect(guestSave.success).toBe(true);

    expect(repository.households[0]).toMatchObject({
      searchLastName: "Nelson",
      householdName: "Mark and Guerdithe",
      contactEmail: "updated@example.com",
      contactPhone: "+1 (555) 010-2000 ext. 4",
    });
    expect(repository.guests[0]).toMatchObject({
      firstName: "Marcus",
      lastName: "Nelson",
      status: "attending",
      notes: "Vegetarian meal",
    });
  });

  it("returns not-found when saving a non-existent household", async () => {
    const repository = createMemoryRepository();
    const result = await saveAdminHousehold(repository, {
      id: 9999,
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      contactEmail: "",
      contactPhone: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("no longer exists");
    }
  });

  it("adds a new guest to an existing household", async () => {
    const repository = createMemoryRepository();
    const created = await createAdminHousehold(repository, {
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const addGuest = await createAdminGuest(
      repository,
      created.data.householdId,
      {
        firstName: "Guerdithe",
        lastName: "Nelson",
      },
    );
    expect(addGuest.success).toBe(true);
    expect(repository.guests).toHaveLength(2);
    expect(repository.guests[1]).toMatchObject({
      firstName: "Guerdithe",
      lastName: "Nelson",
    });
  });
});
