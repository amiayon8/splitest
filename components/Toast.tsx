'use client';

import React from 'react';
import { useSplitest } from '@/lib/store';
import { Check } from 'lucide-react';

export function Toast() {
  const { toastMessage } = useSplitest();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0F172A] dark:bg-[#1E293B] text-white shadow-2xl border border-slate-700/80 animate-bounce-short select-none">
      <Check className="w-4 h-4 text-[#34D399] stroke-[2.5]" />
      <span className="text-[13px] font-medium">{toastMessage}</span>
    </div>
  );
}
