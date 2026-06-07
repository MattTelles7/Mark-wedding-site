import { describe, expect, it } from "vitest";
import { rsvpsToCsv } from "./csv";
import type { RsvpRecord } from "./database";

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
