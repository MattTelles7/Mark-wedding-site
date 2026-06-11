import { beforeEach, describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import { createGuestImportTemplateBuffer } from "@/lib/import-template";
import { GUEST_IMPORT_HEADERS, GUEST_IMPORT_SHEETS } from "@/lib/import-types";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => undefined),
}));

vi.mock("@/lib/import-service", () => ({
  importValidGuestRows: vi.fn(),
  previewGuestImport: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { previewGuestImport } from "@/lib/import-service";
import { previewGuestImportAction } from "./actions";

describe("admin import actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockReset();
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(previewGuestImport).mockImplementation(async (parsed) =>
      parsed.fatalError
        ? {
            success: false,
            message: parsed.fatalError,
            errors: parsed.errors,
          }
        : {
            success: true,
            summary: {
              householdsToCreate: 0,
              householdsCreated: 0,
              existingHouseholdsMatched: 0,
              guestsToCreate: 0,
              guestsCreated: 0,
              duplicateGuestsSkipped: 0,
              rowsRejected: 0,
              warnings: 0,
            },
            householdsToCreate: [],
            existingHouseholdsMatched: [],
            guestsToCreate: [],
            duplicatesSkipped: [],
            warnings: [],
            errors: parsed.errors,
          },
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("rejects non-admin access before reading upload data", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("redirect"));

    await expect(previewGuestImportAction(new FormData())).rejects.toThrow(
      "redirect",
    );
  });

  it("rejects non-xlsx uploads cleanly", async () => {
    const formData = new FormData();
    formData.set("file", new File(["last,first"], "guests.csv"));

    const result = await previewGuestImportAction(formData);

    expect(result).toEqual({
      success: false,
      message: "Upload a .xlsx file using the completed template.",
    });
  });

  it("reads the app-generated template through the server action upload path", async () => {
    const template = await createGuestImportTemplateBuffer();
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [new Uint8Array(template)],
        "wedding-guest-import-template.xlsx",
        {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ),
    );

    const result = await previewGuestImportAction(formData);

    expect(result.success).toBe(true);
    expect(previewGuestImport).toHaveBeenCalledWith({
      rows: [],
      errors: [],
      emptyRowsIgnored: 0,
    });
  });

  it("reads a populated workbook through the server action upload path", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(GUEST_IMPORT_SHEETS.guests);
    sheet.addRow([...GUEST_IMPORT_HEADERS]);
    sheet.addRow(["Wolfe", "", "Mark", "", "", "", ""]);
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [new Uint8Array(await workbook.xlsx.writeBuffer())],
        "wedding-guests.xlsx",
        {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ),
    );

    const result = await previewGuestImportAction(formData);

    expect(result.success).toBe(true);
    expect(previewGuestImport).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            searchLastName: "Wolfe",
            householdName: "The Wolfe Family",
            firstName: "Mark",
            personLastName: "Wolfe",
          }),
        ],
      }),
    );
  });

  it("logs upload metadata and the underlying workbook read error", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(["not a workbook"], "broken.xlsx", {
        type: "application/octet-stream",
      }),
    );

    const result = await previewGuestImportAction(formData);

    expect(result).toEqual({
      success: false,
      message: "The uploaded file could not be read as an .xlsx workbook.",
      errors: [],
    });
    expect(console.error).toHaveBeenCalledWith(
      "Admin guest import upload failed",
      expect.objectContaining({
        fileName: "broken.xlsx",
        fileSize: 14,
        mimeType: "application/octet-stream",
        parseStage: "workbook-read",
        error: expect.any(String),
      }),
    );
    expect(previewGuestImport).toHaveBeenCalledWith(
      expect.objectContaining({
        fatalError: "The uploaded file could not be read as an .xlsx workbook.",
      }),
    );
  });
});
