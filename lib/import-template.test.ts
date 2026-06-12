import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseGuestImportWorkbook } from "./import-parser";
import { createGuestImportTemplateBuffer } from "./import-template";
import { GUEST_IMPORT_HEADERS, GUEST_IMPORT_SHEETS } from "./import-types";

describe("guest import template", () => {
  it("creates workbook with Guests, Instructions, and Example sheets", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      (await createGuestImportTemplateBuffer()) as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0],
    );

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      GUEST_IMPORT_SHEETS.guests,
      GUEST_IMPORT_SHEETS.instructions,
      GUEST_IMPORT_SHEETS.example,
    ]);
  });

  it("puts Guests first with the expected headers", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      (await createGuestImportTemplateBuffer()) as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0],
    );
    const guests = workbook.worksheets[0];

    expect(guests.name).toBe(GUEST_IMPORT_SHEETS.guests);
    expect(
      GUEST_IMPORT_HEADERS.map((_, index) =>
        String(guests.getRow(1).getCell(index + 1).value),
      ),
    ).toEqual([...GUEST_IMPORT_HEADERS]);
    expect(guests.views).toEqual([
      expect.objectContaining({ state: "frozen", ySplit: 1 }),
    ]);
    expect(guests.getRow(1).font.bold).toBe(true);
    expect(guests.getCell("A1").fill).toMatchObject({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8DAB8" },
    });
    expect(guests.getCell("B1").fill).toMatchObject({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8DAB8" },
    });
    expect(guests.getCell("C1").fill).toMatchObject({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF4F0E6" },
    });
  });

  it("can be read by the same tolerant parser used for uploads", async () => {
    const parsed = await parseGuestImportWorkbook(
      await createGuestImportTemplateBuffer(),
    );

    expect(parsed).toEqual({
      rows: [],
      errors: [],
      emptyRowsIgnored: 0,
    });
  });

  it("explains same-last-name grouping and add-only behavior", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      (await createGuestImportTemplateBuffer()) as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0],
    );
    const instructions = workbook.getWorksheet(
      GUEST_IMPORT_SHEETS.instructions,
    );
    const text = instructions
      ?.getSheetValues()
      .flat(2)
      .filter((value) => typeof value === "string")
      .join(" ");

    expect(text).toContain("People with the same last name");
    expect(text).toContain("The Telles Family");
    expect(text).toContain("never updates or deletes existing records");
  });

  it("includes the requested realistic example rows", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      (await createGuestImportTemplateBuffer()) as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0],
    );
    const example = workbook.getWorksheet(GUEST_IMPORT_SHEETS.example);
    const names = example
      ?.getRows(2, 9)
      ?.map((row) => `${row.getCell(1).text} ${row.getCell(2).text}`);

    expect(names).toEqual([
      "Jeremy Wolfe",
      "Amy Wolfe",
      "Mark Wolfe",
      "Guerdithe Nelson",
      "John Smith",
      "Mary Smith",
      "David O'Connor",
      "Ana María García",
      "Jean-Luc Martin",
    ]);
  });
});
