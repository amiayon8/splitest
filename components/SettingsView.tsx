"use client";

import React from "react";
import { useSplitest } from "@/lib/store";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { Coins } from "lucide-react";

export function SettingsView() {
  const {
    supabaseStatus,
    showToast,
    activeCurrency,
    setActiveCurrency,
  } = useSplitest();

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-6 px-4 md:px-6 select-none transition-colors duration-150">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage currency and local ledger preferences
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
              supabaseStatus === "connected"
                ? "bg-[#D1FAE5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#059669]"
                : supabaseStatus === "connecting"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                supabaseStatus === "connected"
                  ? "bg-[#059669] dark:bg-[#10B981]"
                  : "bg-slate-400"
              }`}
            />
            {supabaseStatus === "connected"
              ? "Live Realtime"
              : "Local Offline Cache"}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Personal Default Currency
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your preferred currency for balances and calculations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
          {SUPPORTED_CURRENCIES.map((curr) => {
            const isSelected = activeCurrency === curr.code;
            return (
              <button
                key={curr.code}
                type="button"
                onClick={() => {
                  setActiveCurrency(curr.code);
                  showToast(
                    `Default currency changed to ${curr.code} (${curr.name})`,
                  );
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "border-[#059669] dark:border-[#10B981] bg-[#D1FAE5]/30 dark:bg-[#064E3B]/40 text-[#065F46] dark:text-[#A7F3D0] ring-1 ring-[#059669]"
                    : "border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="text-xs font-bold">{curr.code}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {curr.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <img
            src="/Splitest.svg"
            alt="Splitest"
            className="w-12 h-12 object-contain shadow-xs"
          />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Splitest Web Platform
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Universal consumer bill-splitting and shared expense ledger
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          v1.0.0
        </span>
      </div>
    </div>
  );
}
