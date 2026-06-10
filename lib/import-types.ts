export const GUEST_IMPORT_SHEETS = {
  guests: "Guests",
  instructions: "Instructions",
  example: "Example",
} as const;

export const GUEST_IMPORT_HEADERS = [
  "Last Name",
  "Household Name",
  "First Name",
  "Person Last Name",
  "Contact Email",
  "Contact Phone",
  "Admin Notes",
] as const;

export const MAX_IMPORT_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;

export type GuestImportRow = {
  rowNumber: number;
  searchLastName: string;
  householdName: string;
  firstName: string;
  personLastName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

export type GuestImportIssue = {
  rowNumber: number;
  message: string;
};

export type GuestImportWarning = {
  rowNumber: number;
  message: string;
};

export type GuestImportSummary = {
  householdsToCreate: number;
  householdsCreated: number;
  existingHouseholdsMatched: number;
  guestsToCreate: number;
  guestsCreated: number;
  duplicateGuestsSkipped: number;
  rowsRejected: number;
  warnings: number;
};

export type GuestImportPreview = {
  success: true;
  summary: GuestImportSummary;
  householdsToCreate: Array<{
    householdName: string;
    searchLastName: string;
    guestCount: number;
  }>;
  existingHouseholdsMatched: Array<{
    householdName: string;
    searchLastName: string;
    guestCount: number;
  }>;
  guestsToCreate: Array<{
    rowNumber: number;
    householdName: string;
    firstName: string;
    lastName: string;
  }>;
  duplicatesSkipped: GuestImportWarning[];
  warnings: GuestImportWarning[];
  errors: GuestImportIssue[];
};

export type GuestImportFailure = {
  success: false;
  message: string;
  errors?: GuestImportIssue[];
};

export type GuestImportActionResult = GuestImportPreview | GuestImportFailure;

export function normalizeImportText(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function defaultHouseholdName(lastName: string): string {
  return `The ${lastName} Family`;
}

export function normalizeImportKey(value: string): string {
  return normalizeImportText(value).toLocaleLowerCase("en-US");
}

export function householdImportKey(
  householdName: string,
  searchLastName: string,
): string {
  return `${normalizeImportKey(householdName)}::${normalizeImportKey(searchLastName)}`;
}

export function guestImportKey(firstName: string, lastName: string): string {
  return `${normalizeImportKey(firstName)}::${normalizeImportKey(lastName)}`;
}
