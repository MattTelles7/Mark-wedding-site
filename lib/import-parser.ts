import * as XLSX from "xlsx";
import {
  defaultHouseholdName,
  GUEST_IMPORT_HEADER_ALIASES,
  GUEST_IMPORT_SHEETS,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_UPLOAD_BYTES,
  normalizeImportHeader,
  normalizeImportText,
  type GuestImportColumn,
  type GuestImportIssue,
  type GuestImportRow,
} from "./import-types";

export type ParsedGuestImportWorkbook = {
  rows: GuestImportRow[];
  errors: GuestImportIssue[];
  emptyRowsIgnored: number;
  fatalError?: string;
};

export type GuestImportParseOptions = {
  onWorkbookReadError?: (error: unknown) => void;
  onWorkbookLoaded?: (sheetNames: string[]) => void;
};

export type ImportUploadFile = Pick<
  File,
  "arrayBuffer" | "name" | "size" | "type"
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const XLSX_ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
export const GUEST_IMPORT_READER = "sheetjs";
export const WORKBOOK_FORMAT_ERROR =
  "The workbook was readable, but the Guests sheet or required headers were not found.";

type WorksheetRow = unknown[];

function textFromCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return "";
}

function cellText(row: WorksheetRow, columnNumber: number): string {
  return normalizeImportText(textFromCellValue(row[columnNumber - 1]));
}

function rowIssue(rowNumber: number, message: string): GuestImportIssue {
  return { rowNumber, message };
}

function unreadableWorkbook(
  error: unknown,
  options: GuestImportParseOptions,
): ParsedGuestImportWorkbook {
  options.onWorkbookReadError?.(error);
  return {
    rows: [],
    errors: [],
    emptyRowsIgnored: 0,
    fatalError: "The uploaded file could not be read as an .xlsx workbook.",
  };
}

type GuestImportColumns = Partial<Record<GuestImportColumn, number>>;

type ResolvedHeaders = {
  columns: GuestImportColumns;
  errors: GuestImportIssue[];
};

const normalizedHeaderFields = new Map<string, GuestImportColumn>(
  Object.entries(GUEST_IMPORT_HEADER_ALIASES).flatMap(([field, aliases]) =>
    aliases.map((alias) => [
      normalizeImportHeader(alias),
      field as GuestImportColumn,
    ]),
  ),
);

function resolveHeaders(rows: WorksheetRow[]): ResolvedHeaders {
  const headerRow = rows[0] ?? [];
  const columns: GuestImportColumns = {};
  const errors: GuestImportIssue[] = [];

  for (
    let columnNumber = 1;
    columnNumber <= headerRow.length;
    columnNumber += 1
  ) {
    const header = cellText(headerRow, columnNumber);
    const field = normalizedHeaderFields.get(normalizeImportHeader(header));
    if (!field) {
      continue;
    }
    if (columns[field]) {
      errors.push(
        rowIssue(
          1,
          `Header "${header}" appears more than once in the Guests sheet.`,
        ),
      );
      continue;
    }
    columns[field] = columnNumber;
  }

  for (const requiredField of ["firstName", "lastName"] as const) {
    if (!columns[requiredField]) {
      const expected = GUEST_IMPORT_HEADER_ALIASES[requiredField].join(", ");
      errors.push(
        rowIssue(
          1,
          `Missing required ${requiredField === "firstName" ? "First Name" : "Last Name"} header. Accepted headers: ${expected}.`,
        ),
      );
    }
  }

  return {
    columns,
    errors,
  };
}

function mappedCellText(
  row: WorksheetRow,
  columns: GuestImportColumns,
  field: GuestImportColumn,
): string {
  const columnNumber = columns[field];
  return columnNumber ? cellText(row, columnNumber) : "";
}

function validateRow(row: GuestImportRow): GuestImportIssue[] {
  const errors: GuestImportIssue[] = [];

  if (!row.searchLastName) {
    errors.push(rowIssue(row.rowNumber, "Missing Last Name"));
  } else if (row.searchLastName.length < 2) {
    errors.push(
      rowIssue(row.rowNumber, "Last Name must be at least 2 characters"),
    );
  } else if (row.searchLastName.length > 80) {
    errors.push(
      rowIssue(row.rowNumber, "Last Name must be 80 characters or fewer"),
    );
  }

  if (!row.firstName) {
    errors.push(rowIssue(row.rowNumber, "Missing First Name"));
  } else if (row.firstName.length > 80) {
    errors.push(
      rowIssue(row.rowNumber, "First Name must be 80 characters or fewer"),
    );
  }

  if (row.householdName.length < 2) {
    errors.push(
      rowIssue(row.rowNumber, "Household Name must be at least 2 characters"),
    );
  } else if (row.householdName.length > 120) {
    errors.push(
      rowIssue(row.rowNumber, "Household Name must be 120 characters or fewer"),
    );
  }

  if (row.personLastName.length < 1) {
    errors.push(rowIssue(row.rowNumber, "Person Last Name is required"));
  } else if (row.personLastName.length > 80) {
    errors.push(
      rowIssue(
        row.rowNumber,
        "Person Last Name must be 80 characters or fewer",
      ),
    );
  }

  if (row.contactEmail.length > 180) {
    errors.push(
      rowIssue(row.rowNumber, "Contact Email must be 180 characters or fewer"),
    );
  } else if (row.contactEmail && !EMAIL_PATTERN.test(row.contactEmail)) {
    errors.push(rowIssue(row.rowNumber, "Invalid Contact Email"));
  }

  if (row.contactPhone.length > 80) {
    errors.push(
      rowIssue(row.rowNumber, "Contact Phone must be 80 characters or fewer"),
    );
  }

  if (row.notes.length > 2000) {
    errors.push(
      rowIssue(row.rowNumber, "Admin Notes must be 2,000 characters or fewer"),
    );
  }

  return errors;
}

export function isXlsxFilename(name: string): boolean {
  return name.toLocaleLowerCase("en-US").endsWith(".xlsx");
}

export async function fileToImportBuffer(
  file: ImportUploadFile,
): Promise<Buffer> {
  if (!isXlsxFilename(file.name)) {
    throw new Error("Upload a .xlsx file using the completed template.");
  }
  if (file.size <= 0) {
    throw new Error("Upload a completed .xlsx template before previewing.");
  }
  if (file.size > MAX_IMPORT_UPLOAD_BYTES) {
    throw new Error("Upload is too large. The maximum .xlsx size is 10 MB.");
  }
  return Buffer.from(await file.arrayBuffer());
}

export async function parseGuestImportWorkbook(
  buffer: Buffer,
  options: GuestImportParseOptions = {},
): Promise<ParsedGuestImportWorkbook> {
  let workbook: XLSX.WorkBook;
  try {
    if (
      !buffer.subarray(0, XLSX_ZIP_SIGNATURE.length).equals(XLSX_ZIP_SIGNATURE)
    ) {
      throw new Error("The upload is not a ZIP-based .xlsx workbook.");
    }
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      cellText: true,
      dense: true,
      raw: false,
    });
  } catch (error) {
    return unreadableWorkbook(error, options);
  }
  options.onWorkbookLoaded?.(workbook.SheetNames);

  const sheet = workbook.Sheets[GUEST_IMPORT_SHEETS.guests];
  if (!sheet) {
    return {
      rows: [],
      errors: [],
      emptyRowsIgnored: 0,
      fatalError: WORKBOOK_FORMAT_ERROR,
    };
  }

  let worksheetRows: WorksheetRow[];
  try {
    worksheetRows = XLSX.utils.sheet_to_json<WorksheetRow>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
    });
  } catch (error) {
    return unreadableWorkbook(error, options);
  }
  const resolvedHeaders = resolveHeaders(worksheetRows);
  if (resolvedHeaders.errors.length > 0) {
    return {
      rows: [],
      errors: resolvedHeaders.errors,
      emptyRowsIgnored: 0,
      fatalError: WORKBOOK_FORMAT_ERROR,
    };
  }

  const rows: GuestImportRow[] = [];
  const errors: GuestImportIssue[] = [];
  let emptyRowsIgnored = 0;
  let nonEmptyRows = 0;

  for (let rowIndex = 1; rowIndex < worksheetRows.length; rowIndex += 1) {
    const rowNumber = rowIndex + 1;
    const row = worksheetRows[rowIndex] ?? [];
    const values = (
      Object.keys(resolvedHeaders.columns) as GuestImportColumn[]
    ).map((field) => mappedCellText(row, resolvedHeaders.columns, field));
    if (values.every((value) => !value)) {
      emptyRowsIgnored += 1;
      continue;
    }

    nonEmptyRows += 1;
    if (nonEmptyRows > MAX_IMPORT_ROWS) {
      return {
        rows,
        errors,
        emptyRowsIgnored,
        fatalError: `The Guests sheet has more than ${MAX_IMPORT_ROWS.toLocaleString()} data rows.`,
      };
    }

    const firstName = mappedCellText(row, resolvedHeaders.columns, "firstName");
    const lastName = mappedCellText(row, resolvedHeaders.columns, "lastName");
    const rawHouseholdName = mappedCellText(
      row,
      resolvedHeaders.columns,
      "householdName",
    );
    const rawPersonLastName = mappedCellText(
      row,
      resolvedHeaders.columns,
      "personLastName",
    );
    const householdName = rawHouseholdName || defaultHouseholdName(lastName);
    const personLastName = rawPersonLastName || lastName;
    const importRow: GuestImportRow = {
      rowNumber,
      searchLastName: lastName,
      householdName,
      firstName,
      personLastName,
      contactEmail: mappedCellText(row, resolvedHeaders.columns, "email"),
      contactPhone: mappedCellText(row, resolvedHeaders.columns, "phone"),
      notes: mappedCellText(row, resolvedHeaders.columns, "notes"),
    };

    const rowErrors = validateRow(importRow);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push(importRow);
  }

  return {
    rows,
    errors,
    emptyRowsIgnored,
  };
}
