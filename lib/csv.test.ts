import { describe, expect, it } from "vitest";
import { householdRsvpsToCsv, rsvpsToCsv } from "./csv";
import type { HouseholdExportRow, RsvpRecord } from "./database";

function record(overrides: Partial<RsvpRecord>): RsvpRecord {
  return {
    id: 1,
    fullName: "Guest",
    attending: true,
    guestCount: 1,
    mealChoice: "chicken",
    songRequest: "",
    message: "",
    createdAt: "2026-01-01 00:00:00",
    ...overrides,
  };
}

describe("rsvpsToCsv", () => {
  it("escapes quotes and wraps every cell", () => {
    const csv = rsvpsToCsv([record({ message: 'She said "yes"' })]);

    expect(csv).toContain('"She said ""yes"""');
  });

  it("prefixes spreadsheet formula values", () => {
    const csv = rsvpsToCsv([
      record({
        fullName: "=cmd",
        songRequest: "\t=SUM(1,1)",
        message: "  @malicious",
      }),
    ]);

    expect(csv).toContain('"\'=cmd"');
    expect(csv).toContain('"\'\t=SUM(1,1)"');
    expect(csv).toContain('"\'  @malicious"');
  });
});

describe("householdRsvpsToCsv", () => {
  it("exports household and individual guest data", () => {
    const row: HouseholdExportRow = {
      householdName: "The Wolfe Family",
      searchLastName: "wolfe",
      contactEmail: "host@example.com",
      contactPhone: "",
      householdLocked: true,
      submittedAt: "2026-06-08 12:00:00",
      guestFirstName: "Mark",
      guestLastName: "Wolfe",
      guestStatus: "attending",
      guestNotes: "",
      householdCreatedAt: "2026-06-01 12:00:00",
    };

    const csv = householdRsvpsToCsv([row]);

    expect(csv).toContain('"Household","Search Last Name"');
    expect(csv).toContain('"The Wolfe Family"');
    expect(csv).toContain('"Mark","Wolfe","attending"');
  });

  it("protects formulas in new household fields", () => {
    const row: HouseholdExportRow = {
      householdName: "=cmd",
      searchLastName: "wolfe",
      contactEmail: "",
      contactPhone: "",
      householdLocked: false,
      submittedAt: "",
      guestFirstName: "Mark",
      guestLastName: "Wolfe",
      guestStatus: "pending",
      guestNotes: "@formula",
      householdCreatedAt: "2026-06-01 12:00:00",
    };

    const csv = householdRsvpsToCsv([row]);

    expect(csv).toContain('"\'=cmd"');
    expect(csv).toContain('"\'@formula"');
  });
});
