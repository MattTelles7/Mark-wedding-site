import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeddingDatabase } from "../../lib/database";

const mocks = vi.hoisted(() => ({
  database: undefined as WeddingDatabase | undefined,
  requireAdmin: vi.fn(async () => undefined),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  clearAdminSession: vi.fn(),
  createAdminSession: vi.fn(),
  requireAdmin: mocks.requireAdmin,
  verifyAdminPassword: vi.fn(() => true),
}));

vi.mock("../../lib/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/database")>();

  function database() {
    if (!mocks.database) {
      throw new Error("Test database is not initialized.");
    }
    return mocks.database;
  }

  return {
    ...actual,
    createHouseholdWithGuests: (
      input: Parameters<WeddingDatabase["createHouseholdWithGuests"]>[0],
    ) => database().createHouseholdWithGuests(input),
    createGuest: (
      householdId: number,
      input: Parameters<WeddingDatabase["createGuest"]>[1],
    ) => database().createGuest(householdId, input),
    deleteGuest: (guestId: number) => database().deleteGuest(guestId),
    deleteHousehold: (householdId: number) =>
      database().deleteHousehold(householdId),
    setHouseholdLocked: (householdId: number, isLocked: boolean) =>
      database().setHouseholdLocked(householdId, isLocked),
    setRsvpsOpen: (isOpen: boolean) => database().setRsvpsOpen(isOpen),
    updateGuest: (
      guestId: number,
      input: Parameters<WeddingDatabase["updateGuest"]>[1],
    ) => database().updateGuest(guestId, input),
    updateHousehold: (
      householdId: number,
      input: Parameters<WeddingDatabase["updateHousehold"]>[1],
    ) => database().updateHousehold(householdId, input),
  };
});

import {
  autosaveGuestAction,
  autosaveHouseholdAction,
  createHouseholdAction,
} from "./actions";

beforeEach(() => {
  mocks.database = new WeddingDatabase(":memory:");
  mocks.requireAdmin.mockClear();
  mocks.revalidatePath.mockClear();
});

afterEach(() => {
  mocks.database?.close();
  mocks.database = undefined;
});

describe("admin autosave server actions", () => {
  it("updates household fields in SQLite and revalidates admin and RSVP views", async () => {
    const created = await createHouseholdAction({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }
    mocks.revalidatePath.mockClear();

    const result = await autosaveHouseholdAction({
      id: created.data.householdId,
      searchLastName: "Nelson",
      householdName: "Mark and Guerdithe",
      contactEmail: "family@example.com",
      contactPhone: "555-0100",
    });

    expect(result.success).toBe(true);
    expect(mocks.requireAdmin).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rsvp");
    expect(mocks.database!.getHouseholds()[0]).toMatchObject({
      searchLastName: "Nelson",
      householdName: "Mark and Guerdithe",
      contactEmail: "family@example.com",
      contactPhone: "555-0100",
    });
  });

  it("updates guest status and notes in SQLite while the household is closed", async () => {
    const created = await createHouseholdAction({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }

    const householdId = created.data.householdId;
    const guestId = mocks.database!.getHouseholds()[0].guests[0].id;
    mocks.database!.setHouseholdLocked(householdId, true);
    mocks.revalidatePath.mockClear();

    const result = await autosaveGuestAction(guestId, {
      firstName: "Marcus",
      lastName: "Wolfe",
      status: "attending",
      notes: "Autosaved note",
    });

    expect(result.success).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rsvp");
    const household = mocks.database!.getHouseholds()[0];
    expect(household.isLocked).toBe(true);
    expect(household.guests[0]).toMatchObject({
      firstName: "Marcus",
      status: "attending",
      notes: "Autosaved note",
    });
  });

  it("returns validation errors without changing SQLite", async () => {
    const created = await createHouseholdAction({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }
    mocks.revalidatePath.mockClear();

    const result = await autosaveHouseholdAction({
      id: created.data.householdId,
      searchLastName: "Wolfe",
      householdName: " ",
      contactEmail: "",
      contactPhone: "",
    });

    expect(result.success).toBe(false);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.database!.getHouseholds()[0].householdName).toBe(
      "The Wolfe Family",
    );
  });
});
