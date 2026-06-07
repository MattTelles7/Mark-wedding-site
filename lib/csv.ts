import type { RsvpRecord } from "./database";

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
