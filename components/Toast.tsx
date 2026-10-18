'use client';

import React from 'react';
import { useSplitest } from '@/lib/store';

export function Toast() {
  const { toastMessage } = useSplitest();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#191c1e] text-[#ffffff] shadow-2xl border border-[#2d3133] animate-bounce-short">
      <span className="material-symbols-outlined text-[#85f8c4] text-[20px]">
        check_circle
      </span>
      <span className="text-[13px] font-medium">{toastMessage}</span>
    </div>
  );
}
