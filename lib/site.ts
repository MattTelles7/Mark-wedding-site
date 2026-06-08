function daysUntil(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(year, month - 1, day);
  return Math.ceil((targetUtc - todayUtc) / 86_400_000);
}

export function getSiteConfig() {
  const weddingDateIso = process.env.WEDDING_DATE_ISO || "2026-07-18";
  const daysToGo = daysUntil(weddingDateIso);

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
    countdown:
      daysToGo === null
        ? null
        : daysToGo > 0
          ? `${daysToGo} days until we celebrate`
          : daysToGo === 0
            ? "Today is the day"
            : "Joyfully married",
    ceremony: {
      time: process.env.CEREMONY_TIME || "2:30 PM",
      title: "Nuptial Mass",
      venue: process.env.CEREMONY_VENUE || "St. Joseph's Catholic Church",
      address: process.env.CEREMONY_ADDRESS || "",
    },
    reception: {
      message: "Reception details to follow",
    },
    rsvpDeadline: process.env.RSVP_DEADLINE || "June 26, 2026",
    rsvpDeadlineIso: process.env.RSVP_DEADLINE_ISO || "2026-06-26",
    registryMessage: "Registry details coming soon.",
  };
}
