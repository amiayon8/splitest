"use client";

import React, { useState, useEffect } from "react";
import { useSplitest } from "@/lib/store";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { X, Check, SlidersHorizontal, Coins, Users, Shield } from "lucide-react";

const LEDGER_CATEGORIES = [
  "Trip",
  "Home",
  "Event",
  "Project",
  "Dining",
  "Other",
];

export function LedgerSettingsModal() {
  const {
    activeGroup,
    isLedgerSettingsModalOpen,
    setIsLedgerSettingsModalOpen,
    updateGroup,
    isViewOnly,
  } = useSplitest();

  const [name, setName] = useState(activeGroup?.name || "");
  const [category, setCategory] = useState(activeGroup?.category || "Trip");
  const [currency, setCurrency] = useState(activeGroup?.defaultCurrency || "USD");
  const [simplifyDebts, setSimplifyDebts] = useState(
    activeGroup?.simplifyDebts ?? true
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeGroup) {
      setName(activeGroup.name);
      setCategory(activeGroup.category || "Trip");
      setCurrency(activeGroup.defaultCurrency || "USD");
      setSimplifyDebts(activeGroup.simplifyDebts ?? true);
    }
  }, [activeGroup, isLedgerSettingsModalOpen]);

  if (!isLedgerSettingsModalOpen || !activeGroup) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) {
      setIsLedgerSettingsModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    await updateGroup(activeGroup.id, {
      name: name.trim() || activeGroup.name,
      category,
      defaultCurrency: currency,
      simplifyDebts,
    });
    setIsSubmitting(false);
    setIsLedgerSettingsModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in select-none">
      <div
        className="w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-[#0F172A] rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-settings-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="ledger-settings-title"
                className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight"
              >
                Ledger Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeGroup.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLedgerSettingsModalOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 thin-scrollbar">
          {isViewOnly && (
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <span>You have view-only access to this ledger. Settings cannot be modified.</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="ledger-name-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2"
              >
                Ledger Name
              </label>
              <input
                id="ledger-name-input"
                type="text"
                disabled={isViewOnly}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981] disabled:opacity-60 transition-colors"
                required
              />
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Category
              </span>
              <div className="flex flex-wrap gap-2">
                {LEDGER_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={isViewOnly}
                      onClick={() => setCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-[#D1FAE5] dark:bg-[#064E3B]/70 border-[#059669] dark:border-[#10B981] text-[#065F46] dark:text-[#A7F3D0]"
                          : "bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-[#059669] dark:text-[#10B981]" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Ledger Base Currency
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  All expenses, shares, and settlements in this ledger use this currency
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = currency === curr.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    disabled={isViewOnly}
                    onClick={() => setCurrency(curr.code)}
                    className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      isSelected
                        ? "border-[#059669] dark:border-[#10B981] bg-[#D1FAE5]/40 dark:bg-[#064E3B]/40 text-[#065F46] dark:text-[#A7F3D0] ring-1 ring-[#059669]"
                        : "border-slate-200/80 dark:border-slate-700 bg-white dark:bg-[#1E293B]/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{curr.code}</span>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-400">
                          {curr.symbol}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {curr.name}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#059669] dark:text-[#10B981] shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Simplify Debts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automatically minimize total transactions required to settle balances
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={simplifyDebts}
                disabled={isViewOnly}
                onClick={() => setSimplifyDebts(!simplifyDebts)}
                className={`w-12 h-7 rounded-full p-1 transition-colors ${
                  simplifyDebts
                    ? "bg-[#059669] dark:bg-[#10B981]"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    simplifyDebts ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{activeGroup.members.length} members in this ledger</span>
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
              Role: {activeGroup.userRole}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsLedgerSettingsModalOpen(false)}
              className="px-5 h-11 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 h-11 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-sm active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
