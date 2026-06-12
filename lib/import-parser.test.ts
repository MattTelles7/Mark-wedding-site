import ExcelJS from "exceljs";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  fileToImportBuffer,
  GUEST_IMPORT_READER,
  parseGuestImportWorkbook,
  WORKBOOK_FORMAT_ERROR,
} from "./import-parser";
import { createGuestImportTemplateBuffer } from "./import-template";
import {
  GUEST_IMPORT_HEADERS,
  GUEST_IMPORT_SHEETS,
  LEGACY_GUEST_IMPORT_HEADERS,
} from "./import-types";

async function workbookBuffer(
  rows: string[][],
  headers: readonly string[] = GUEST_IMPORT_HEADERS,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(GUEST_IMPORT_SHEETS.guests);
  sheet.addRow([...headers]);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function sheetJsWorkbookBuffer(
  rows: string[][],
  headers: readonly string[] = GUEST_IMPORT_HEADERS,
): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[...headers], ...rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, GUEST_IMPORT_SHEETS.guests);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

async function namespacePrefixedWorkbookBuffer(): Promise<Buffer> {
  const zip = await JSZip.loadAsync(
    await workbookBuffer([["Ana María", "García", "", "", "External writer"]]),
  );
  const workbookXmlFile = zip.file("xl/workbook.xml");
  if (!workbookXmlFile) {
    throw new Error("Generated fixture is missing xl/workbook.xml");
  }

  const workbookXml = (await workbookXmlFile.async("string"))
    .replace(
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
      '<x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    )
    .replace("</workbook>", "</x:workbook>");
  if (!workbookXml.includes("<x:workbook")) {
    throw new Error("Could not create the namespace-prefixed workbook fixture");
  }

  zip.file("xl/workbook.xml", workbookXml);
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
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
      await workbookBuffer([["Mark", "Wolfe", "", "", ""]]),
    );

    expect(parsed.fatalError).toBeUndefined();
    expect(parsed.rows[0]).toMatchObject({
      firstName: "Mark",
      personLastName: "Wolfe",
      searchLastName: "Wolfe",
      householdName: "The Wolfe Family",
    });
  });

  it("parses a workbook written independently with SheetJS", async () => {
    const parsed = await parseGuestImportWorkbook(
      sheetJsWorkbookBuffer([
        ["Guerdithe", "Nelson", "guerdithe@example.com", "", "Bride"],
      ]),
    );

    expect(parsed).toEqual({
      rows: [
        expect.objectContaining({
          firstName: "Guerdithe",
          personLastName: "Nelson",
          householdName: "The Nelson Family",
          contactEmail: "guerdithe@example.com",
          notes: "Bride",
        }),
      ],
      errors: [],
      emptyRowsIgnored: 0,
    });
  });

  it("parses namespace-prefixed workbook XML that ExcelJS cannot read", async () => {
    const buffer = await namespacePrefixedWorkbookBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
    const sheetNames: string[][] = [];

    expect(workbookXml).toContain(
      '<x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    );

    const excelJsWorkbook = new ExcelJS.Workbook();
    await expect(
      excelJsWorkbook.xlsx.load(
        buffer as unknown as Parameters<typeof excelJsWorkbook.xlsx.load>[0],
      ),
    ).rejects.toThrow("reading 'sheets'");

    const parsed = await parseGuestImportWorkbook(buffer, {
      onWorkbookLoaded(names) {
        sheetNames.push(names);
      },
    });

    expect(GUEST_IMPORT_READER).toBe("sheetjs");
    expect(sheetNames).toEqual([[GUEST_IMPORT_SHEETS.guests]]);
    expect(parsed).toEqual({
      rows: [
        expect.objectContaining({
          firstName: "Ana María",
          personLastName: "García",
          householdName: "The García Family",
          notes: "External writer",
        }),
      ],
      errors: [],
      emptyRowsIgnored: 0,
    });
  });

  it("ignores fully empty rows", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        ["", "", "", "", ""],
        ["Mark", "Wolfe", "", "", ""],
      ]),
    );

    expect(parsed.emptyRowsIgnored).toBe(1);
    expect(parsed.rows).toHaveLength(1);
  });

  it("trims and collapses repeated whitespace", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        ["  Ana   María ", "  Van   Buren ", "", "", "  Needs   aisle   seat "],
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

  it("generates the household and person last name from Last Name", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([["Guerdithe", "Nelson", "", "", ""]]),
    );

    expect(parsed.rows[0]).toMatchObject({
      householdName: "The Nelson Family",
      personLastName: "Nelson",
    });
  });

  it("rejects invalid email only when provided", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        ["Mark", "Wolfe", "not-an-email", "", ""],
        ["Guerdithe", "Nelson", "", "", ""],
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
      await workbookBuffer([["José Ángel", "García", "", "", ""]]),
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      searchLastName: "García",
      firstName: "José Ángel",
      personLastName: "García",
    });
  });

  it("accepts apostrophes and hyphenated names", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        ["David", "O'Connor", "", "", ""],
        ["Jean-Luc", "Martin", "", "", ""],
      ]),
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          firstName: "David",
          personLastName: "O'Connor",
        }),
        expect.objectContaining({
          firstName: "Jean-Luc",
          personLastName: "Martin",
        }),
      ]),
    );
  });

  it("detects missing required Last Name and First Name", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer([
        ["Mark", "", "", "", ""],
        ["", "Wolfe", "", "", ""],
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

  it("accepts header aliases, punctuation differences, reordering, and extra columns", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer(
        [["ignored", "telles@example.com", "Telles", "Matt", "Family friend"]],
        ["Unrelated", "Contact Email", "Surname", "Given-Name", "Notes"],
      ),
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      firstName: "Matt",
      personLastName: "Telles",
      householdName: "The Telles Family",
      contactEmail: "telles@example.com",
      notes: "Family friend",
    });
  });

  it("supports the old seven-column template format", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer(
        [
          [
            "Telles",
            "Matt and Lilly",
            "Lilly",
            "Wolfe",
            "lilly@example.com",
            "555-0100",
            "Legacy template",
          ],
        ],
        LEGACY_GUEST_IMPORT_HEADERS,
      ),
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      searchLastName: "Telles",
      householdName: "Matt and Lilly",
      firstName: "Lilly",
      personLastName: "Wolfe",
      contactEmail: "lilly@example.com",
      contactPhone: "555-0100",
      notes: "Legacy template",
    });
  });

  it("reports parsed sheet names without logging workbook contents", async () => {
    const sheetNames: string[][] = [];

    await parseGuestImportWorkbook(
      await workbookBuffer([["Mark", "Wolfe", "", "", ""]]),
      {
        onWorkbookLoaded(names) {
          sheetNames.push(names);
        },
      },
    );

    expect(sheetNames).toEqual([[GUEST_IMPORT_SHEETS.guests]]);
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

  it("rejects duplicate recognized headers as a format error", async () => {
    const parsed = await parseGuestImportWorkbook(
      await workbookBuffer(
        [["Mark", "Wolfe", "duplicate"]],
        ["First Name", "Last Name", "Surname"],
      ),
    );

    expect(parsed.fatalError).toBe(WORKBOOK_FORMAT_ERROR);
    expect(parsed.errors[0].message).toContain("appears more than once");
  });
});
