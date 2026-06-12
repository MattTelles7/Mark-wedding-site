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
      colNumber === 1 || colNumber === 2
        ? requiredHeaderFill
        : optionalHeaderFill;
  });
}

export async function createGuestImportTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const guests = workbook.addWorksheet(GUEST_IMPORT_SHEETS.guests, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  guests.addRow([...GUEST_IMPORT_HEADERS]);
  styleHeaderRow(guests.getRow(1));
  guests.columns = [
    { key: "firstName", width: 22 },
    { key: "lastName", width: 22 },
    { key: "email", width: 30 },
    { key: "phone", width: 20 },
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
      "First Name",
      "Yes",
      "Invited person's first name. Add one invited person per row.",
    ],
    [
      "Last Name",
      "Yes",
      'Invited person\'s last name. People with the same last name are grouped into "The [Last Name] Family".',
    ],
    [
      "Email",
      "No",
      "Household contact email. For a new family, the first non-empty email is used.",
    ],
    [
      "Phone",
      "No",
      "Household contact phone. For a new family, the first non-empty phone is used.",
    ],
    ["Admin Notes", "No", "Private note for this invited person."],
  ]);
  instructions.addRow([]);
  instructions.addRow([
    "Family grouping",
    "",
    'Matt Telles and Lilly Telles become "The Telles Family". If automatic grouping is wrong, import the rows and adjust the households manually in the admin dashboard afterward.',
  ]);
  instructions.addRow([
    "Important",
    "",
    "The import only adds missing families and people. It skips duplicates and never updates or deletes existing records.",
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
    ["Jeremy", "Wolfe", "", "", "Host"],
    ["Amy", "Wolfe", "", "", "Host"],
    ["Mark", "Wolfe", "", "", ""],
    ["Guerdithe", "Nelson", "", "", ""],
    ["John", "Smith", "", "", ""],
    ["Mary", "Smith", "", "", ""],
    ["David", "O'Connor", "", "", ""],
    ["Ana María", "García", "", "", ""],
    ["Jean-Luc", "Martin", "", "", ""],
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
