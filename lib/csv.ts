import type { HouseholdExportRow } from "./database";

function csvCell(value: string | number | boolean) {
  let text = String(value).replace(/\r\n?/g, "\n");

  if (/^[\s\uFEFF]*[=+\-@\t\n\uFF0B\uFF0D\uFF1D\uFF20]/u.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function householdRsvpsToCsv(rows: HouseholdExportRow[]) {
  const header = [
    "Household",
    "Last Name",
    "Contact Email",
    "Contact Phone",
    "Submission Status",
    "Submitted At",
    "Guest First Name",
    "Guest Last Name",
    "Guest RSVP Status",
    "Admin Notes",
    "Household Created At",
  ];

  const values = rows.map((row) => [
    row.householdName,
    row.searchLastName,
    row.contactEmail,
    row.contactPhone,
    row.householdLocked ? "Submitted and Closed" : "Open for Submission",
    row.submittedAt,
    row.guestFirstName,
    row.guestLastName,
    row.guestStatus,
    row.guestNotes,
    row.householdCreatedAt,
  ]);

  return [header, ...values]
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\r\n");
}
