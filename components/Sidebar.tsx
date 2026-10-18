"use client";

import React, { useMemo, useState } from "react";
import { useSplitest } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { calculateMemberBalances } from "@/lib/split-calculator";
import {
  Users,
  UserCheck,
  Receipt,
  MessageSquare,
  PieChart,
  User,
  Plus,
  ChevronDown,
  ChevronRight,
  Shield,
  Settings,
} from "lucide-react";

export function Sidebar() {
  const {
    groups,
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
  } = useSplitest();

  const [isGroupsOpen, setIsGroupsOpen] = useState(true);

  const groupBalances = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    for (const group of groups) {
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
      balanceMap[group.id] = balances["You"]?.netBalance || 0;
    }
    return balanceMap;
  }, [groups, allExpenses, allSettlements]);

  const navLinks = [
    { id: "wallet", label: "Groups", icon: Users },
    { id: "groups", label: "Friends", icon: UserCheck },
    { id: "expenses", label: "Activity", icon: Receipt },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "analytics", label: "Insights", icon: PieChart },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 bg-white dark:bg-[#0F172A] border-r border-slate-200/80 dark:border-slate-800 flex flex-col select-none transition-colors duration-150 w-20 lg:w-[260px]">
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
            {groups.map((group) => {
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

      <div className="p-3 lg:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center lg:justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Splitest
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
          v1.2
        </span>
      </div>
    </aside>
  );
}
