import ExcelJS from "exceljs";
import { GUEST_IMPORT_HEADERS, GUEST_IMPORT_SHEETS } from "./import-types";

export const GUEST_IMPORT_TEMPLATE_FILENAME =
  "wedding-guest-import-template.xlsx";

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const requiredHeaderFill = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFE8DAB8" },
};

const optionalHeaderFill = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFF4F0E6" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF10263F" } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.eachCell((cell, colNumber) => {
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFAD8B57" } },
    };
    cell.fill =
      colNumber === 1 || colNumber === 3
        ? requiredHeaderFill
        : optionalHeaderFill;
  });
}

export async function createGuestImportTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Wedding RSVP Admin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const guests = workbook.addWorksheet(GUEST_IMPORT_SHEETS.guests, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  guests.addRow([...GUEST_IMPORT_HEADERS]);
  styleHeaderRow(guests.getRow(1));
  guests.columns = [
    { key: "lastName", width: 22 },
    { key: "householdName", width: 28 },
    { key: "firstName", width: 22 },
    { key: "personLastName", width: 22 },
    { key: "contactEmail", width: 30 },
    { key: "contactPhone", width: 20 },
    { key: "adminNotes", width: 36 },
  ];

  const instructions = workbook.addWorksheet(GUEST_IMPORT_SHEETS.instructions);
  instructions.columns = [
    { key: "field", width: 24 },
    { key: "required", width: 14 },
    { key: "meaning", width: 72 },
  ];
  instructions.addRow(["Column", "Required?", "How to fill it out"]);
  styleHeaderRow(instructions.getRow(1));
  instructions.addRows([
    [
      "Last Name",
      "Yes",
      "Household/family search last name. Guests will search by this last name.",
    ],
    [
      "Household Name",
      "No",
      'Display name for the invitation. Blank cells become "The [Last Name] Family".',
    ],
    ["First Name", "Yes", "Invited person first name. One row per person."],
    [
      "Person Last Name",
      "No",
      "Invited person last name. Blank cells use the household Last Name.",
    ],
    [
      "Contact Email",
      "No",
      "Household-level contact email. For multiple rows in one household, the first non-empty value wins.",
    ],
    [
      "Contact Phone",
      "No",
      "Household-level phone. For multiple rows in one household, the first non-empty value wins.",
    ],
    ["Admin Notes", "No", "Private note for this invited person."],
  ]);
  instructions.addRow([]);
  instructions.addRow([
    "Important",
    "",
    "The import is add-only. It creates missing households/people, skips duplicate people, and never updates or deletes existing records.",
  ]);
  instructions.addRow([
    "Limits",
    "",
    "Upload .xlsx files only. Maximum upload size is 10 MB and the Guests sheet may contain up to 5,000 data rows.",
  ]);
  instructions.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  const example = workbook.addWorksheet(GUEST_IMPORT_SHEETS.example);
  example.addRow([...GUEST_IMPORT_HEADERS]);
  styleHeaderRow(example.getRow(1));
  example.columns = guests.columns;
  example.addRows([
    [
      "Wolfe",
      "The Wolfe Family",
      "Amy",
      "Wolfe",
      "amy@example.com",
      "(555) 010-1000",
      "Host family",
    ],
    ["Wolfe", "The Wolfe Family", "Jeremy", "Wolfe", "", "", ""],
    ["Nelson", "", "Guerdithe", "", "guerdithe@example.com", "", "Bride"],
    ["Nelson", "", "Guest", "Nelson", "", "", ""],
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
