import { describe, expect, it } from "vitest";
import {
  defaultGuestLastName,
  householdStatusActionLabel,
  householdStatusLabel,
  mergeSavedFields,
  nextGuestDraftKey,
  updateHouseholdLastName,
  updateHouseholdName,
  validateInvitedGuest,
  validateNewHousehold,
} from "./admin-validation";

describe("admin household validation", () => {
  it("rejects zero-person and whitespace-only households", () => {
    const noGuests = validateNewHousehold({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      guests: [],
    });
    const whitespace = validateNewHousehold({
      searchLastName: "   ",
      householdName: "   ",
      guests: [{ firstName: " ", lastName: " " }],
    });

    expect(noGuests.ok).toBe(false);
    if (!noGuests.ok) {
      expect(noGuests.errors.guests).toBe("Add at least one invited person.");
    }
    expect(whitespace.ok).toBe(false);
    if (!whitespace.ok) {
      expect(whitespace.errors.searchLastName).toBe("Last Name is required.");
      expect(whitespace.errors["guests.0.firstName"]).toBe(
        "First Name is required.",
      );
    }
  });

  it("suggests a household name until the admin edits it manually", () => {
    let draft = {
      searchLastName: "",
      householdName: "",
      householdNameManuallyEdited: false,
    };

    draft = updateHouseholdLastName(draft, "Wolfe");
    expect(draft.householdName).toBe("The Wolfe Family");

    draft = updateHouseholdName(draft, "Mark and Guerdithe");
    draft = updateHouseholdLastName(draft, "Nelson");
    expect(draft.householdName).toBe("Mark and Guerdithe");
  });

  it("prefills a new member surname from the household or first guest", () => {
    expect(defaultGuestLastName(" Wolfe ", [{ lastName: "Nelson" }])).toBe(
      "Wolfe",
    );
    expect(defaultGuestLastName("", [{ lastName: " Nelson " }])).toBe("Nelson");
  });

  it("validates optional email only when supplied and rejects malformed data", () => {
    expect(
      validateNewHousehold({
        searchLastName: "Wolfe",
        householdName: "The Wolfe Family",
        contactEmail: "",
        contactPhone: " (555) 010-2000 ext. 4 ",
        guests: [{ firstName: "Mark", lastName: "Wolfe" }],
      }).ok,
    ).toBe(true);

    const invalid = validateNewHousehold({
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
      contactEmail: "not-an-email",
      guests: [{ firstName: "Mark", lastName: "Wolfe" }],
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors.contactEmail).toBe("Enter a valid email address.");
    }

    expect(
      validateInvitedGuest({
        firstName: "Mark",
        lastName: "Wolfe",
        status: "invalid",
      }).ok,
    ).toBe(false);
  });

  it("uses the exact submission labels and actions", () => {
    expect(householdStatusLabel(false)).toBe("Open for Submission");
    expect(householdStatusLabel(true)).toBe("Submitted and Closed");
    expect(householdStatusActionLabel(false)).toBe(
      "Mark as Submitted and Closed",
    );
    expect(householdStatusActionLabel(true)).toBe("Reopen for Submission");
  });

  it("does not overwrite newer typed values when an autosave finishes", () => {
    expect(
      mergeSavedFields(
        {
          householdName: "Newer typed name",
          contactEmail: "family@example.com",
        },
        {
          householdName: "Submitted name",
          contactEmail: "family@example.com",
        },
        {
          householdName: "Submitted name",
          contactEmail: "family@example.com",
        },
      ),
    ).toEqual({
      value: {
        householdName: "Newer typed name",
        contactEmail: "family@example.com",
      },
      hasNewerChanges: true,
    });
  });

  it("creates temporary guest keys without secure-context browser APIs", () => {
    const first = nextGuestDraftKey();
    const second = nextGuestDraftKey();

    expect(first).toMatch(/^guest-draft-\d+$/);
    expect(second).not.toBe(first);
  });
});
