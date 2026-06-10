import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock external dependencies before importing server actions
// ---------------------------------------------------------------------------

const mockDb = {
  households: [] as Array<{
    id: number;
    householdName: string;
    searchLastName: string;
    contactEmail: string;
    contactPhone: string;
    isLocked: boolean;
    guests: Array<{
      id: number;
      firstName: string;
      lastName: string;
      status: "pending" | "attending" | "declined";
      notes: string;
    }>;
  }>,
  nextHouseholdId: 1,
  nextGuestId: 1,
  rsvpsOpen: false,
};

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  clearAdminSession: vi.fn(),
  createAdminSession: vi.fn(),
  requireAdmin: vi.fn(async () => undefined),
  verifyAdminPassword: vi.fn(() => true),
}));

vi.mock("../../lib/database", () => ({
  areRsvpsOpen: vi.fn(async () => mockDb.rsvpsOpen),
  setRsvpsOpen: vi.fn(async (v: boolean) => {
    mockDb.rsvpsOpen = v;
  }),
  createHouseholdWithGuests: vi.fn(
    async (input: {
      householdName: string;
      searchLastName: string;
      contactEmail?: string;
      contactPhone?: string;
      guests: Array<{
        firstName: string;
        lastName: string;
        status?: string;
        notes?: string;
      }>;
    }) => {
      if (input.guests.length === 0)
        throw new Error("at least one invited person");
      const id = mockDb.nextHouseholdId++;
      const guests = input.guests.map((g) => ({
        id: mockDb.nextGuestId++,
        firstName: g.firstName.trim(),
        lastName: g.lastName.trim(),
        status: (g.status ?? "pending") as "pending" | "attending" | "declined",
        notes: g.notes?.trim() ?? "",
      }));
      mockDb.households.push({
        id,
        householdName: input.householdName.trim(),
        searchLastName: input.searchLastName.trim(),
        contactEmail: input.contactEmail?.trim() ?? "",
        contactPhone: input.contactPhone?.trim() ?? "",
        isLocked: false,
        guests,
      });
      return id;
    },
  ),
  updateHousehold: vi.fn(
    async (
      id: number,
      input: {
        householdName: string;
        searchLastName: string;
        contactEmail?: string;
        contactPhone?: string;
      },
    ) => {
      const h = mockDb.households.find((h) => h.id === id);
      if (!h) return false;
      h.householdName = input.householdName.trim();
      h.searchLastName = input.searchLastName.trim();
      h.contactEmail = input.contactEmail?.trim() ?? "";
      h.contactPhone = input.contactPhone?.trim() ?? "";
      return true;
    },
  ),
  createGuest: vi.fn(
    async (
      householdId: number,
      input: { firstName: string; lastName: string },
    ) => {
      const id = mockDb.nextGuestId++;
      const h = mockDb.households.find((h) => h.id === householdId);
      h?.guests.push({
        id,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        status: "pending",
        notes: "",
      });
      return id;
    },
  ),
  updateGuest: vi.fn(
    async (
      id: number,
      input: {
        firstName: string;
        lastName: string;
        status: "pending" | "attending" | "declined";
        notes?: string;
      },
    ) => {
      for (const h of mockDb.households) {
        const g = h.guests.find((g) => g.id === id);
        if (g) {
          g.firstName = input.firstName.trim();
          g.lastName = input.lastName.trim();
          g.status = input.status;
          g.notes = input.notes?.trim() ?? "";
          return true;
        }
      }
      return false;
    },
  ),
  deleteGuest: vi.fn(async (id: number) => {
    for (const h of mockDb.households) {
      const idx = h.guests.findIndex((g) => g.id === id);
      if (idx !== -1) {
        if (h.guests.length <= 1) return false;
        h.guests.splice(idx, 1);
        return true;
      }
    }
    return false;
  }),
  deleteHousehold: vi.fn(async (id: number) => {
    const idx = mockDb.households.findIndex((h) => h.id === id);
    if (idx !== -1) mockDb.households.splice(idx, 1);
  }),
  setHouseholdLocked: vi.fn(async (id: number, locked: boolean) => {
    const h = mockDb.households.find((h) => h.id === id);
    if (h) h.isLocked = locked;
  }),
}));

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import {
  autosaveGuestAction,
  autosaveHouseholdAction,
  createHouseholdAction,
} from "./actions";

beforeEach(() => {
  mockDb.households = [];
  mockDb.nextHouseholdId = 1;
  mockDb.nextGuestId = 1;
  mockDb.rsvpsOpen = false;
  vi.mocked(revalidatePath).mockClear();
});

describe("admin server actions", () => {
  it("creates a household and revalidates admin and RSVP views", async () => {
    const result = await createHouseholdAction({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });

    expect(result.success).toBe(true);
    expect(mockDb.households).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/rsvp");
  });

  it("updates household fields and revalidates admin and RSVP views", async () => {
    const created = await createHouseholdAction({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) return;
    vi.mocked(revalidatePath).mockClear();

    const result = await autosaveHouseholdAction({
      id: created.data.householdId,
      searchLastName: "Nelson",
      householdName: "Mark and Guerdithe",
      contactEmail: "family@example.com",
      contactPhone: "555-0100",
    });

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/rsvp");
    expect(mockDb.households[0]).toMatchObject({
      searchLastName: "Nelson",
      householdName: "Mark and Guerdithe",
      contactEmail: "family@example.com",
      contactPhone: "555-0100",
    });
  });

  it("updates guest status and notes while the household is locked", async () => {
    const created = await createHouseholdAction({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const guestId = mockDb.households[0].guests[0].id;
    mockDb.households[0].isLocked = true;
    vi.mocked(revalidatePath).mockClear();

    const result = await autosaveGuestAction(guestId, {
      firstName: "Marcus",
      lastName: "Wolfe",
      status: "attending",
      notes: "Autosaved note",
    });

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/rsvp");
    expect(mockDb.households[0].isLocked).toBe(true);
    expect(mockDb.households[0].guests[0]).toMatchObject({
      firstName: "Marcus",
      status: "attending",
      notes: "Autosaved note",
    });
  });

  it("returns validation errors without changing the database", async () => {
    const created = await createHouseholdAction({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) return;
    vi.mocked(revalidatePath).mockClear();

    const result = await autosaveHouseholdAction({
      id: created.data.householdId,
      searchLastName: "Wolfe",
      householdName: " ",
      contactEmail: "",
      contactPhone: "",
    });

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(mockDb.households[0].householdName).toBe("The Wolfe Family");
  });
});
