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
  const weddingDateIso = process.env.WEDDING_DATE_ISO || "2026-09-26";
  const daysToGo = daysUntil(weddingDateIso);

  return {
    coupleNames: process.env.COUPLE_NAMES || "Lilly & Christopher",
    monogram: process.env.WEDDING_MONOGRAM || "L&C",
    weddingDate: process.env.WEDDING_DATE || "Saturday, September 26, 2026",
    weddingDateIso,
    shortDate: process.env.WEDDING_SHORT_DATE || "9.26.2026",
    countdown:
      daysToGo === null
        ? null
        : daysToGo > 0
          ? `${daysToGo} Days To Go!`
          : daysToGo === 0
            ? "Today!"
            : "Just Married",
    venue: process.env.WEDDING_VENUE || "The Hall",
    location: process.env.WEDDING_LOCATION || "St Leon, IN",
    ceremony: {
      time: "2:00 PM",
      title: "Ceremony",
      venue: "St. Joseph's Catholic Church",
      address: "7536 Church Ln, West Harrison, Indiana",
    },
    reception: {
      time: "4:00 PM",
      title: "Reception",
      venue: "The Hall",
      address: "624 Delaware Rd, Batesville, IN",
      note: "Reception directly follows wedding mass.",
    },
    travel: {
      hotel: "Best Western Hotel",
      address: "1030 State Rd 229 North, Batesville, IN 47006",
      phone: "812-934-6262",
      rate: "$110",
      note: "A hotel block is available for the wedding night. Please call the hotel directly to reserve a room.",
    },
    story: [
      "Lilly and Christopher began as high school friends, sharing lunch tables, English class, and the kind of everyday moments that slowly became something more.",
      "Their story includes a handwritten notebook, the code word potatoes, a first hand-hold at the movies, prom, road trips, late-night milkshakes, and a beach proposal in Gulf Shores.",
      "Now they are bringing the people they love together in Indiana to celebrate the next chapter.",
    ],
    weddingParty: {
      honorAttendants: [
        { name: "Josephine Wolfe", role: "Maid of Honor" },
        { name: "Daniel Sigg", role: "Best Man" },
      ],
      bridesmaids: [
        "Cecilia Wolfe",
        "Kathrine Telles",
        "Lindsey Tenhundfeld",
        "Isabella Vincent",
        "Emma Williams",
        "Maria Murphy",
        "Margaret Glasshagel",
        "Olive Telles",
      ],
      groomsmen: [
        "Michael Telles",
        "Alex Telles",
        "Mark Wolfe",
        "Nathan Kritzer",
        "Samuel Gross",
        "Jon Gross",
        "Dylan Bryan",
        "Owen Ziebro",
      ],
      juniorParty: [
        { name: "Bridget Wolfe", role: "Junior Bridesmaid" },
        { name: "Blaise Wolfe", role: "Junior Groomsman" },
        { name: "Jack Wolfe", role: "Ring Bearer" },
        { name: "Penelope & Vivian Telles", role: "Flower Girls" },
      ],
    },
  };
}
