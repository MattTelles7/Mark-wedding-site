import { describe, expect, it } from "vitest";
import { getCountdownMessage } from "./countdown";

describe("getCountdownMessage", () => {
  it("shows days before the wedding", () => {
    expect(
      getCountdownMessage("2026-07-18", "2:30 PM", new Date(2026, 5, 8, 10, 0)),
    ).toBe("40 days until we celebrate");
  });

  it("uses the singular form one day before the wedding", () => {
    expect(
      getCountdownMessage(
        "2026-07-18",
        "2:30 PM",
        new Date(2026, 6, 17, 23, 59),
      ),
    ).toBe("1 day until we celebrate");
  });

  it("shows minutes remaining on the wedding day", () => {
    expect(
      getCountdownMessage(
        "2026-07-18",
        "2:30 PM",
        new Date(2026, 6, 18, 14, 0),
      ),
    ).toBe("30 minutes until the nuptial Mass");
  });

  it("shows a day-of message after the ceremony begins", () => {
    expect(
      getCountdownMessage(
        "2026-07-18",
        "2:30 PM",
        new Date(2026, 6, 18, 15, 0),
      ),
    ).toBe("Today is the day");
  });

  it("shows a completed message after the wedding day", () => {
    expect(
      getCountdownMessage("2026-07-18", "2:30 PM", new Date(2026, 6, 19, 0, 1)),
    ).toBe("Joyfully married");
  });

  it("returns null for invalid values", () => {
    expect(getCountdownMessage("not-a-date", "afternoon")).toBeNull();
  });
});
