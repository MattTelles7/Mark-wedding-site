import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
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
  });
});
