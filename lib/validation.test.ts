import { describe, expect, it } from "vitest";
import {
  validateHouseholdConfirmation,
  validateHouseholdSearch,
  validateRsvpForm,
} from "./validation";

function validForm() {
  const formData = new FormData();
  formData.set("fullName", "Alex Morgan");
  formData.set("attending", "yes");
  formData.set("guestCount", "2");
  formData.set("mealChoice", "vegetarian");
  formData.set("songRequest", "At Last");
  formData.set("message", "Looking forward to it!");
  return formData;
}

describe("validateRsvpForm", () => {
  it("accepts and normalizes a valid attending response", () => {
    const result = validateRsvpForm(validForm());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestCount).toBe(2);
      expect(result.data.mealChoice).toBe("vegetarian");
    }
  });

  it("normalizes declined responses to zero guests and no meal", () => {
    const formData = validForm();
    formData.set("attending", "no");

    const result = validateRsvpForm(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestCount).toBe(0);
      expect(result.data.mealChoice).toBe("not_applicable");
    }
  });

  it("rejects an attending response without a valid meal", () => {
    const formData = validForm();
    formData.set("mealChoice", "");

    const result = validateRsvpForm(formData);

    expect(result.success).toBe(false);
    if (!result.success && !result.isHoneypot) {
      expect(result.errors.mealChoice).toBeDefined();
    }
  });

  it("silently identifies honeypot submissions", () => {
    const formData = validForm();
    formData.set("website", "https://spam.example");

    const result = validateRsvpForm(formData);

    expect(result.isHoneypot).toBe(true);
  });
});

describe("validateHouseholdSearch", () => {
  it("normalizes whitespace in a valid last name", () => {
    const formData = new FormData();
    formData.set("lastName", "  Van   Buren ");

    expect(validateHouseholdSearch(formData)).toEqual({
      success: true,
      isHoneypot: false,
      lastName: "Van Buren",
    });
  });

  it("rejects short searches", () => {
    const formData = new FormData();
    formData.set("lastName", "A");

    expect(validateHouseholdSearch(formData).success).toBe(false);
  });
});

describe("validateHouseholdConfirmation", () => {
  it("accepts per-person responses with final confirmation", () => {
    const formData = new FormData();
    formData.set("householdId", "12");
    formData.set("guest-31", "attending");
    formData.set("guest-32", "declined");
    formData.set("confirmFinal", "yes");

    const result = validateHouseholdConfirmation(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.householdId).toBe(12);
      expect(result.responses).toEqual([
        { guestId: 31, status: "attending" },
        { guestId: 32, status: "declined" },
      ]);
    }
  });

  it("requires the final-response acknowledgment", () => {
    const formData = new FormData();
    formData.set("householdId", "12");
    formData.set("guest-31", "attending");

    const result = validateHouseholdConfirmation(formData);

    expect(result.success).toBe(false);
    if (!result.success && !result.isHoneypot) {
      expect(result.message).toContain("final");
    }
  });
});
