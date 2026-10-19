"use client";

import React, { useMemo, useState } from "react";
import { useSplitest } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import {
  calculateMemberBalances,
  getCurrentUserBalance,
} from "@/lib/split-calculator";
import {
  Users,
  UserCheck,
  ArrowLeftRight,
  Receipt,
  MessageSquare,
  PieChart,
  User,
  Plus,
  ChevronDown,
  ChevronRight,
  Shield,
  Sun,
  Moon,
  Database,
  CloudCheck,
} from "lucide-react";

export function Sidebar() {
  const {
    groups,
    expenseGroups,
    activeGroupId,
    setActiveGroupId,
    currentView,
    setCurrentView,
    setIsAddExpenseModalOpen,
    setIsNewGroupModalOpen,
    allExpenses,
    allSettlements,
    isViewOnly,
    activeCurrency,
    theme,
    setTheme,
    supabaseStatus,
    pendingSyncCount,
    isOffline,
    syncNow,
    userProfile,
  } = useSplitest();

  const [isGroupsOpen, setIsGroupsOpen] = useState(true);

  const groupBalances = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    for (const group of expenseGroups) {
      const gExpenses = allExpenses.filter((item) => item.groupId === group.id);
      const gSettlements = allSettlements.filter(
        (item) => item.groupId === group.id,
      );
      const memberNames = group.members.map((m) => m.name);
      const balances = calculateMemberBalances(
        memberNames,
        gExpenses,
        gSettlements,
      );
      balanceMap[group.id] =
        getCurrentUserBalance(balances, group, userProfile)?.netBalance || 0;
    }
    return balanceMap;
  }, [groups, allExpenses, allSettlements, userProfile]);

  const navLinks = [
    { id: "wallet", label: "Groups", icon: Users },
    { id: "groups", label: "Friends", icon: UserCheck },
    { id: "debts", label: "Debt Flow", icon: ArrowLeftRight },
    { id: "expenses", label: "Activity", icon: Receipt },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "analytics", label: "Insights", icon: PieChart },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 bg-white dark:bg-[#0F172A] border-r border-slate-200/80 dark:border-slate-800 flex flex-col select-none transition-colors duration-150 w-20 lg:w-65">
      <div className="p-3 lg:p-4">
        {!isViewOnly ? (
          <button
            type="button"
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="w-full h-12 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center gap-2.5 font-semibold text-sm transition-all shadow-sm active:scale-98"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="hidden lg:inline">Add Expense</span>
          </button>
        ) : (
          <div className="w-full h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">View Only Access</span>
          </div>
        )}
      </div>

      <nav className="px-2 lg:px-3 space-y-1">
        {navLinks.map((item) => {
          const isActive = currentView === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-center lg:justify-start gap-3 h-11 px-3 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? "bg-[#D1FAE5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#A7F3D0] font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <IconComponent className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="hidden lg:block my-4 px-4 border-t border-slate-100 dark:border-slate-800 pt-4 flex-1 overflow-y-auto thin-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setIsGroupsOpen(!isGroupsOpen)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {isGroupsOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Groups
          </button>
          <button
            type="button"
            onClick={() => setIsNewGroupModalOpen(true)}
            className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {isGroupsOpen && (
          <div className="space-y-1">
            {expenseGroups.map((group) => {
              const isSelected =
                activeGroupId === group.id && currentView === "wallet";
              const balance = groupBalances[group.id] || 0;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setCurrentView("wallet");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs transition-all ${
                    isSelected
                      ? "bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-xs shrink-0">
                      {group.name.slice(0, 1)}
                    </div>
                    <span className="truncate">{group.name}</span>
                  </div>

                  {balance !== 0 && (
                    <span
                      className={`text-[11px] font-bold tabular-nums shrink-0 ${
                        balance > 0
                          ? "text-[#059669] dark:text-[#10B981]"
                          : "text-[#E11D48] dark:text-[#F43F5E]"
                      }`}
                    >
                      {balance > 0
                        ? `+${formatCurrency(balance, activeCurrency)}`
                        : formatCurrency(balance, activeCurrency)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-2 lg:p-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => void syncNow()}
          className="w-full h-8 px-2 lg:px-3 rounded-xl flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          title="Click to sync"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isOffline
                  ? "bg-amber-500"
                  : supabaseStatus === "connected"
                    ? "bg-emerald-500"
                    : supabaseStatus === "connecting"
                      ? "bg-sky-500 animate-ping"
                      : "bg-slate-400"
              }`}
            />
            <span className="hidden lg:inline truncate">
              {isOffline
                ? "Offline Cache"
                : supabaseStatus === "connected"
                  ? "Synced"
                  : supabaseStatus === "connecting"
                    ? "Connecting..."
                    : "Local Mode"}
            </span>
          </div>
          {pendingSyncCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold">
              {pendingSyncCount} queued
            </span>
          ) : (
            <Database className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hidden lg:inline shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            const isCurrentlyDark =
              typeof document !== "undefined"
                ? document.documentElement.classList.contains("dark")
                : theme === "dark";
            setTheme(isCurrentlyDark ? "light" : "dark");
          }}
          className="w-full h-10 px-2 lg:px-3 rounded-2xl flex items-center justify-center lg:justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle theme appearance"
        >
          <div className="flex items-center gap-2.5">
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="hidden lg:inline">
              {theme === "dark" ? "Dark Theme" : "Light Theme"}
            </span>
          </div>
          <span className="hidden lg:inline text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {theme}
          </span>
        </button>

        <div className="hidden lg:flex items-center justify-between px-1 text-[11px] text-slate-400 dark:text-slate-500">
          <span>Splitest</span>
          <span className="font-mono text-[10px]">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
