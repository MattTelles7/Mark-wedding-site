import { describe, expect, it } from "vitest";
import { householdRsvpsToCsv } from "./csv";
import type { HouseholdExportRow } from "./database";

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

    expect(csv).toContain('"Household","Last Name"');
    expect(csv).toContain('"Submitted and Closed"');
    expect(csv).toContain('"The Wolfe Family"');
    expect(csv).toContain('"Mark","Wolfe","attending"');
  });

  it("escapes quotes in cell values", () => {
    const row: HouseholdExportRow = {
      householdName: 'The "Wolfe" Family',
      searchLastName: "wolfe",
      contactEmail: "",
      contactPhone: "",
      householdLocked: false,
      submittedAt: "",
      guestFirstName: "Mark",
      guestLastName: "Wolfe",
      guestStatus: "pending",
      guestNotes: "",
      householdCreatedAt: "2026-06-01 12:00:00",
    };

    const csv = householdRsvpsToCsv([row]);

    expect(csv).toContain('"The ""Wolfe"" Family"');
  });

  it("protects spreadsheet formula values", () => {
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
    expect(csv).toContain('"Open for Submission"');
  });
});
