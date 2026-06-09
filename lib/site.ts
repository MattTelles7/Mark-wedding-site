import { getCountdownMessage } from "./countdown";

export function getSiteConfig() {
  const weddingDateIso = process.env.WEDDING_DATE_ISO || "2026-07-18";
  const ceremonyTime = process.env.CEREMONY_TIME || "2:30 PM";

  return {
    coupleNames: process.env.COUPLE_NAMES || "Mark & Guerdithe",
    fullNames: {
      first: process.env.FIRST_FULL_NAME || "Mark Jerome Wolfe",
      second: process.env.SECOND_FULL_NAME || "Guerdithe Mielda Nelson",
    },
    hostNames: process.env.HOST_NAMES || "Amy and Jeremy Wolfe",
    monogram: process.env.WEDDING_MONOGRAM || "M&G",
    weddingDate: process.env.WEDDING_DATE || "Saturday, July 18, 2026",
    weddingDateIso,
    shortDate: process.env.WEDDING_SHORT_DATE || "07.18.2026",
    countdown: getCountdownMessage(weddingDateIso, ceremonyTime),
    ceremony: {
      time: ceremonyTime,
      title: "Nuptial Mass",
      venue: process.env.CEREMONY_VENUE || "St. Joseph's Catholic Church",
      address: process.env.CEREMONY_ADDRESS || "",
    },
    reception: {
      venue: "Knights of Columbus Hall",
      address: "333 Main Street, Brookville, IN 47012",
      timing: "Directly following Mass",
    },
    rsvpDeadline: process.env.RSVP_DEADLINE || "June 26, 2026",
    rsvpDeadlineIso: process.env.RSVP_DEADLINE_ISO || "2026-06-26",
  };
}
