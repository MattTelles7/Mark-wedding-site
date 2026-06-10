"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 10_000;

export function AdminAutoRefresh() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    // Clear the visual indicator after a short delay
    setTimeout(() => setRefreshing(false), 600);
  }, [router]);

  // Auto-refresh every 10 seconds while the tab is visible
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  return (
    <button
      className={`button button-secondary button-small admin-refresh-btn${refreshing ? " admin-refresh-spinning" : ""}`}
      type="button"
      title="Refresh dashboard data"
      onClick={refresh}
    >
      ↻ Refresh
    </button>
  );
}
