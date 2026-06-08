import type { HouseholdExportRow, RsvpRecord } from "./database";

function csvCell(value: string | number | boolean) {
  let text = String(value).replace(/\r\n?/g, "\n");

  if (/^[\s\uFEFF]*[=+\-@\t\n\uFF0B\uFF0D\uFF1D\uFF20]/u.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function rsvpsToCsv(rsvps: RsvpRecord[]) {
  const header = [
    "Full Name",
    "Attending",
    "Guest Count",
    "Meal Choice",
    "Song Request",
    "Message",
    "Submitted At",
  ];

  const rows = rsvps.map((rsvp) => [
    rsvp.fullName,
    rsvp.attending ? "Yes" : "No",
    rsvp.guestCount,
    rsvp.mealChoice,
    rsvp.songRequest,
    rsvp.message,
    rsvp.createdAt,
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\r\n");
}

export function householdRsvpsToCsv(rows: HouseholdExportRow[]) {
  const header = [
    "Household",
    "Search Last Name",
    "Contact Email",
    "Contact Phone",
    "Household Locked",
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
    row.householdLocked ? "Yes" : "No",
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
