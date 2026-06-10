"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL = 10;

export function AdminAutoRefresh() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const remainingRef = useRef(REFRESH_INTERVAL);
  const routerRef = useRef(router);

  // Keep routerRef in sync without triggering re-renders
  useEffect(() => {
    routerRef.current = router;
  });

  const doRefresh = useCallback(() => {
    remainingRef.current = REFRESH_INTERVAL;
    setCountdown(REFRESH_INTERVAL);
    setSpinning(true);
    routerRef.current.refresh();
    setTimeout(() => setSpinning(false), 500);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;

      remainingRef.current -= 1;
      setCountdown(remainingRef.current);

      if (remainingRef.current <= 0) {
        remainingRef.current = REFRESH_INTERVAL;
        setCountdown(REFRESH_INTERVAL);
        setSpinning(true);
        routerRef.current.refresh();
        setTimeout(() => setSpinning(false), 500);
      }
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  return (
    <button
      className="button button-secondary button-small admin-refresh-btn"
      type="button"
      title={`Auto-refreshes in ${countdown}s — click to refresh now`}
      onClick={doRefresh}
    >
      <span
        className={`admin-refresh-icon${spinning ? " admin-refresh-spinning" : ""}`}
        aria-hidden="true"
      >
        ↻
      </span>
      <span className="admin-refresh-countdown">Refresh {countdown}s</span>
    </button>
  );
}
