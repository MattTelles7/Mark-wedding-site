import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  fileToImportBuffer,
  parseGuestImportWorkbook,
  WORKBOOK_FORMAT_ERROR,
} from "./import-parser";
import { createGuestImportTemplateBuffer } from "./import-template";
import { GUEST_IMPORT_HEADERS, GUEST_IMPORT_SHEETS } from "./import-types";

async function workbookBuffer(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(GUEST_IMPORT_SHEETS.guests);
  sheet.addRow([...GUEST_IMPORT_HEADERS]);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("guest import parser", () => {
  it("parses the app-generated template through the upload buffer path", async () => {
    const template = await createGuestImportTemplateBuffer();
    const file = new File(
      [new Uint8Array(template)],
      "wedding-guest-import-template.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    const uploadedBuffer = await fileToImportBuffer(file);
    const parsed = await parseGuestImportWorkbook(uploadedBuffer);

    expect(Buffer.isBuffer(uploadedBuffer)).toBe(true);
    expect(uploadedBuffer.equals(template)).toBe(true);
    expect(parsed).toEqual({
      rows: [],
      errors: [],
      emptyRowsIgnored: 0,
    });
  });

  it("parses a valid ExcelJS workbook buffer", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([["Wolfe", "", "Mark", "", "", "", ""]]),
    );

    expect(parsed.fatalError).toBeUndefined();
    expect(parsed.rows).toHaveLength(1);
  });

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

  it("rejects an empty xlsx upload cleanly", async () => {
    const file = new File([], "guests.xlsx");

    await expect(fileToImportBuffer(file)).rejects.toThrow(
      "Upload a completed .xlsx template",
    );
  });

  it("returns a safe error and reports the underlying bad-binary error", async () => {
    const readErrors: unknown[] = [];
    const parsed = await parseGuestImportWorkbook(
      Buffer.from("not an xlsx archive"),
      {
        onWorkbookReadError(error) {
          readErrors.push(error);
        },
      },
    );

    expect(parsed.fatalError).toBe(
      "The uploaded file could not be read as an .xlsx workbook.",
    );
    expect(readErrors).toHaveLength(1);
    expect(readErrors[0]).toBeInstanceOf(Error);
  });

  it("reports a readable workbook with no Guests sheet as a format error", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Other");

    const parsed = await parseGuestImportWorkbook(
      Buffer.from(await workbook.xlsx.writeBuffer()),
    );

    expect(parsed.fatalError).toBe(WORKBOOK_FORMAT_ERROR);
  });

  it("reports wrong Guests headers as a format error with row details", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(GUEST_IMPORT_SHEETS.guests);
    sheet.addRow(["Wrong Header"]);

    const parsed = await parseGuestImportWorkbook(
      Buffer.from(await workbook.xlsx.writeBuffer()),
    );

    expect(parsed.fatalError).toBe(WORKBOOK_FORMAT_ERROR);
    expect(parsed.errors[0]).toMatchObject({ rowNumber: 1 });
  });
});
