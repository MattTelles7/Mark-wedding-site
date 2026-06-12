import ExcelJS from "exceljs";
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
export const WORKBOOK_FORMAT_ERROR =
  "The workbook was readable, but the Guests sheet or required headers were not found.";

function textFromCellValue(value: ExcelJS.CellValue | undefined): string {
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
  if ("text" in value && typeof value.text === "string") {
    return value.text;
  }
  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join("");
  }
  if ("result" in value && value.result !== undefined) {
    return textFromCellValue(value.result as ExcelJS.CellValue);
  }
  return "";
}

function cellText(row: ExcelJS.Row, columnNumber: number): string {
  return normalizeImportText(
    textFromCellValue(row.getCell(columnNumber).value),
  );
}

function rowIssue(rowNumber: number, message: string): GuestImportIssue {
  return { rowNumber, message };
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

function resolveHeaders(sheet: ExcelJS.Worksheet): ResolvedHeaders {
  const headerRow = sheet.getRow(1);
  const columns: GuestImportColumns = {};
  const errors: GuestImportIssue[] = [];

  for (
    let columnNumber = 1;
    columnNumber <= headerRow.cellCount;
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
  row: ExcelJS.Row,
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
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch (error) {
    options.onWorkbookReadError?.(error);
    return {
      rows: [],
      errors: [],
      emptyRowsIgnored: 0,
      fatalError: "The uploaded file could not be read as an .xlsx workbook.",
    };
  }
  options.onWorkbookLoaded?.(workbook.worksheets.map((sheet) => sheet.name));

  const sheet = workbook.getWorksheet(GUEST_IMPORT_SHEETS.guests);
  if (!sheet) {
    return {
      rows: [],
      errors: [],
      emptyRowsIgnored: 0,
      fatalError: WORKBOOK_FORMAT_ERROR,
    };
  }

  const resolvedHeaders = resolveHeaders(sheet);
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

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
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
