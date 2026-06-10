import { describe, expect, it } from "vitest";

const DB_AVAILABLE = Boolean(process.env.DATABASE_URL);
const describeDb = DB_AVAILABLE ? describe : describe.skip;
import {
  areRsvpsOpen,
  confirmHousehold,
  createGuest,
  createHousehold,
  createHouseholdWithGuests,
  deleteGuest,
  deleteHousehold,
  getHouseholdSummary,
  getHouseholds,
  searchPublicHouseholds,
  setHouseholdLocked,
  setRsvpsOpen,
  updateGuest,
} from "./database";

describeDb("settings", () => {
  it("starts with RSVPs closed and can toggle", async () => {
    expect(await areRsvpsOpen()).toBe(false);
    await setRsvpsOpen(true);
    expect(await areRsvpsOpen()).toBe(true);
    await setRsvpsOpen(false);
    expect(await areRsvpsOpen()).toBe(false);
  });
});

describeDb("household RSVP workflow", () => {
  it("requires a complete response and locks a household atomically", async () => {
    const householdId = await createHousehold({
      householdName: "The Nelson Family",
      searchLastName: "Nelson",
      contactEmail: "private@example.com",
    });
    const firstGuestId = await createGuest(householdId, {
      firstName: "Guerdithe",
      lastName: "Nelson",
    });
    const secondGuestId = await createGuest(householdId, {
      firstName: "Guest",
      lastName: "Nelson",
    });

    // RSVPs closed
    expect(
      await confirmHousehold(householdId, [
        { guestId: firstGuestId, status: "attending" },
        { guestId: secondGuestId, status: "declined" },
      ]),
    ).toEqual({ success: false, code: "closed" });

    await setRsvpsOpen(true);

    // Incomplete response
    expect(
      await confirmHousehold(householdId, [
        { guestId: firstGuestId, status: "attending" },
      ]),
    ).toEqual({ success: false, code: "invalid_responses" });

    let household = (await getHouseholds())[0];
    expect(household.isLocked).toBe(false);
    expect(household.guests.map((g) => g.status)).toEqual([
      "pending",
      "pending",
    ]);

    // Valid response
    expect(
      await confirmHousehold(householdId, [
        { guestId: firstGuestId, status: "attending" },
        { guestId: secondGuestId, status: "declined" },
      ]),
    ).toEqual({ success: true });

    household = (await getHouseholds())[0];
    expect(household.isLocked).toBe(true);
    expect(household.submittedAt).not.toBeNull();
    expect(household.guests.map((g) => g.status)).toEqual([
      "attending",
      "declined",
    ]);

    // Already locked
    expect(
      await confirmHousehold(householdId, [
        { guestId: firstGuestId, status: "declined" },
        { guestId: secondGuestId, status: "declined" },
      ]),
    ).toEqual({ success: false, code: "locked" });
  });

  it("uses exact normalized surname search and omits private fields", async () => {
    const householdId = await createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "  Wolfe ",
      contactEmail: "private@example.com",
      contactPhone: "555-0100",
    });
    await createGuest(householdId, {
      firstName: "Mark",
      lastName: "Wolfe",
      notes: "Private admin note",
    });

    expect(await searchPublicHouseholds("wolf")).toEqual([]);
    const results = await searchPublicHouseholds(" WOLFE ");

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

  it("reports individual and household dashboard counts", async () => {
    const householdId = await createHousehold({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
    });
    const firstGuestId = await createGuest(householdId, {
      firstName: "Mark",
      lastName: "Wolfe",
    });
    await createGuest(householdId, {
      firstName: "Guest",
      lastName: "Wolfe",
      status: "declined",
    });
    await updateGuest(firstGuestId, {
      firstName: "Mark",
      lastName: "Wolfe",
      status: "attending",
    });
    await setHouseholdLocked(householdId, true);

    expect(await getHouseholdSummary()).toEqual({
      totalInvited: 2,
      pending: 0,
      attending: 1,
      declined: 1,
      lockedHouseholds: 1,
      totalHouseholds: 1,
    });
  });

  it("will not delete the final invited person from a household", async () => {
    await createHouseholdWithGuests({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    const household = (await getHouseholds())[0];
    expect(await deleteGuest(household.guests[0].id)).toBe(false);
    expect((await getHouseholds())[0].guests).toHaveLength(1);
  });

  it("deletes additional people and cascades a confirmed household deletion", async () => {
    const householdId = await createHouseholdWithGuests({
      householdName: "The Wolfe Family",
      searchLastName: "Wolfe",
      guests: [
        { firstName: "Mark", lastName: "Wolfe" },
        { firstName: "Guerdithe", lastName: "Wolfe" },
      ],
    });
    const household = (await getHouseholds())[0];
    const secondGuestId = household.guests[1].id;
    expect(await deleteGuest(secondGuestId)).toBe(true);
    expect((await getHouseholds())[0].guests).toHaveLength(1);

    await deleteHousehold(householdId);
    expect(await getHouseholds()).toEqual([]);
  });

  it("requires at least one guest when creating a household with guests", async () => {
    await expect(
      createHouseholdWithGuests({
        householdName: "Empty Household",
        searchLastName: "Empty",
        guests: [],
      }),
    ).rejects.toThrow("at least one invited person");
  });
});
