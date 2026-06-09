const DAY_IN_MILLISECONDS = 86_400_000;
const MINUTE_IN_MILLISECONDS = 60_000;

function parseCeremonyTime(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  return {
    hour: (hour % 12) + (period === "PM" ? 12 : 0),
    minute,
  };
}

export function getCountdownMessage(
  weddingDateIso: string,
  ceremonyTime: string,
  now = new Date(),
) {
  const [year, month, day] = weddingDateIso.split("-").map(Number);
  const parsedTime = parseCeremonyTime(ceremonyTime);

  if (!year || !month || !day || !parsedTime) {
    return null;
  }

  const todayKey = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const weddingDayKey = Date.UTC(year, month - 1, day);
  const daysRemaining = Math.round(
    (weddingDayKey - todayKey) / DAY_IN_MILLISECONDS,
  );

  if (daysRemaining > 0) {
    return `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} until we celebrate`;
  }

  if (daysRemaining < 0) {
    return "Joyfully married";
  }

  const ceremony = new Date(
    year,
    month - 1,
    day,
    parsedTime.hour,
    parsedTime.minute,
  );
  const minutesRemaining = Math.ceil(
    (ceremony.getTime() - now.getTime()) / MINUTE_IN_MILLISECONDS,
  );

  if (minutesRemaining > 0) {
    return `${minutesRemaining.toLocaleString()} ${
      minutesRemaining === 1 ? "minute" : "minutes"
    } until the nuptial Mass`;
  }

  return "Today is the day";
}
