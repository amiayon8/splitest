"use client";

import React, { useEffect, useState } from "react";
import { useSplitest } from "@/lib/store";
import { WifiOff, RefreshCw, CloudCheck, Database } from "lucide-react";

export function OfflineBanner() {
  const { isOffline, pendingSyncCount, supabaseStatus, syncNow } =
    useSplitest();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleOnline = () => {
      setShowReconnected(true);
      timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (
    !isOffline &&
    !showReconnected &&
    pendingSyncCount === 0 &&
    supabaseStatus !== "connecting"
  ) {
    return null;
  }

  if (showReconnected) {
    return (
      <aside
        aria-label="Connection status"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none animate-fade-in"
      >
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D1FAE5] dark:bg-[#064E3B]/90 text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] shadow-sm text-xs font-semibold backdrop-blur-md">
          <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Back online • Synced with database</span>
        </div>
      </aside>
    );
  }

  if (isOffline) {
    return (
      <aside
        aria-label="Offline status banner"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none animate-fade-in"
      >
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-600/40 shadow-sm text-xs font-semibold backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            {pendingSyncCount > 0
              ? `Offline • ${pendingSyncCount} unsynced ${pendingSyncCount === 1 ? "change" : "changes"} queued`
              : "Offline • Operating in local offline mode"}
          </span>
        </div>
      </aside>
    );
  }

  if (supabaseStatus === "connecting" || pendingSyncCount > 0) {
    return (
      <aside
        aria-label="Database sync banner"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 select-none animate-fade-in"
      >
        <button
          type="button"
          onClick={() => void syncNow()}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-sm text-xs font-semibold backdrop-blur-md hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>
            {pendingSyncCount > 0
              ? `Syncing ${pendingSyncCount} offline ${pendingSyncCount === 1 ? "action" : "actions"} with database...`
              : "Syncing..."}
          </span>
        </button>
      </aside>
    );
  }

  return null;
}
