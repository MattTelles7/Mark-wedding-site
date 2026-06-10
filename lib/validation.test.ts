import { describe, expect, it } from "vitest";
import {
  validateHouseholdConfirmation,
  validateHouseholdSearch,
} from "./validation";

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

  it("silently identifies honeypot submissions", () => {
    const formData = new FormData();
    formData.set("lastName", "Smith");
    formData.set("website", "https://spam.example");

    const result = validateHouseholdSearch(formData);

    expect(result.isHoneypot).toBe(true);
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

  it("rejects responses with invalid guest status", () => {
    const formData = new FormData();
    formData.set("householdId", "12");
    formData.set("guest-31", "maybe");
    formData.set("confirmFinal", "yes");

    const result = validateHouseholdConfirmation(formData);

    expect(result.success).toBe(false);
  });
});
