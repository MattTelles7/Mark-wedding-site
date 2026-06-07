import { describe, expect, it } from "vitest";
import { validateRsvpForm } from "./validation";

function validForm() {
  const formData = new FormData();
  formData.set("fullName", "Alex Morgan");
  formData.set("attending", "yes");
  formData.set("guestCount", "2");
  formData.set("mealChoice", "vegetarian");
  formData.set("songRequest", "September");
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
