import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { fileToImportBuffer, parseGuestImportWorkbook } from "./import-parser";
import { GUEST_IMPORT_HEADERS, GUEST_IMPORT_SHEETS } from "./import-types";

async function workbookBuffer(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(GUEST_IMPORT_SHEETS.guests);
  sheet.addRow([...GUEST_IMPORT_HEADERS]);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("guest import parser", () => {
  it("ignores fully empty rows", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        ["", "", "", "", "", "", ""],
        ["Wolfe", "", "Mark", "", "", "", ""],
      ]),
    );

    expect(parsed.emptyRowsIgnored).toBe(1);
    expect(parsed.rows).toHaveLength(1);
  });

  it("trims and collapses repeated whitespace", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        [
          "  Van   Buren ",
          "  The   Van   Buren   Family ",
          "  Ana   María ",
          "  Van   Buren ",
          "",
          "",
          "  Needs   aisle   seat ",
        ],
      ]),
    );

    expect(parsed.rows[0]).toMatchObject({
      searchLastName: "Van Buren",
      householdName: "The Van Buren Family",
      firstName: "Ana María",
      personLastName: "Van Buren",
      notes: "Needs aisle seat",
    });
  });

  it("defaults Household Name and Person Last Name from Last Name", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([["Nelson", "", "Guerdithe", "", "", "", ""]]),
    );

    expect(parsed.rows[0]).toMatchObject({
      householdName: "The Nelson Family",
      personLastName: "Nelson",
    });
  });

  it("rejects invalid email only when provided", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        ["Wolfe", "", "Mark", "", "not-an-email", "", ""],
        ["Nelson", "", "Guerdithe", "", "", "", ""],
      ]),
    );

    expect(parsed.errors).toContainEqual({
      rowNumber: 2,
      message: "Invalid Contact Email",
    });
    expect(parsed.rows).toHaveLength(1);
  });

  it("accepts Unicode and accented names", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([["García", "", "José Ángel", "", "", "", ""]]),
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      searchLastName: "García",
      firstName: "José Ángel",
      personLastName: "García",
    });
  });

  it("detects missing required Last Name and First Name", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        ["", "", "Mark", "", "", "", ""],
        ["Wolfe", "", "", "", "", "", ""],
      ]),
    );

    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        { rowNumber: 2, message: "Missing Last Name" },
        { rowNumber: 3, message: "Missing First Name" },
      ]),
    );
    expect(parsed.rows).toEqual([]);
  });

  it("rejects non-xlsx uploads cleanly", async () => {
    const file = new File(["last,first"], "guests.csv", { type: "text/csv" });

    await expect(fileToImportBuffer(file)).rejects.toThrow(".xlsx");
  });
});
