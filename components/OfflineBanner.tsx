'use client';

import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/lib/offlineQueue';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleOnline = () => {
      setShowReconnected(true);
      timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] shadow-sm text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Back online • Synced with cloud</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F1F5F9] text-slate-700 border border-slate-300 shadow-sm text-xs font-semibold">
        <WifiOff className="w-3.5 h-3.5 text-slate-500" />
        <span>Offline • Changes saved locally</span>
      </div>
    </div>
  );
}
