"use client";

import { useEffect, useState } from "react";
import { getCountdownMessage } from "@/lib/countdown";

export function Countdown({
  weddingDateIso,
  ceremonyTime,
  initialMessage,
}: {
  weddingDateIso: string;
  ceremonyTime: string;
  initialMessage: string | null;
}) {
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    const updateCountdown = () => {
      setMessage(getCountdownMessage(weddingDateIso, ceremonyTime));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 60_000);

    return () => window.clearInterval(interval);
  }, [ceremonyTime, weddingDateIso]);

  if (!message) {
    return null;
  }

  return (
    <p className="countdown" aria-live="polite">
      {message}
    </p>
  );
}
