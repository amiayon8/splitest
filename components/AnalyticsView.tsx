'use client';

import React, { useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import {
  calculateMemberBalances,
  calculateSimplifiedDebts,
  calculateDirectDebts,
  calculateCategoryBreakdown,
  getCurrentUserMemberName,
} from '@/lib/split-calculator';
import {
  ArrowRight,
  ArrowLeftRight,
} from 'lucide-react';

export function AnalyticsView() {
  const {
    activeGroup,
    expenses,
    settlements,
    simplifyDebts,
    setSimplifyDebts,
    setIsSettleModalOpen,
    setSettlePrefill,
    showToast,
    isViewOnly,
    activeCurrency,
    userProfile,
  } = useSplitest();

  const currentMemberName = getCurrentUserMemberName(activeGroup, userProfile);
  const isSelf = (name: string) =>
    name === currentMemberName ||
    name === 'You' ||
    (Boolean(userProfile?.fullName) && name === userProfile.fullName) ||
    (Boolean(userProfile?.username) && name === userProfile.username);

  const memberNames = useMemo(() => activeGroup.members.map((m) => m.name), [activeGroup]);

  const memberBalances = useMemo(() => {
    return calculateMemberBalances(memberNames, expenses, settlements);
  }, [memberNames, expenses, settlements]);

  const debts = useMemo(() => {
    if (simplifyDebts) {
      return calculateSimplifiedDebts(memberBalances);
    }
    return calculateDirectDebts(expenses, settlements);
  }, [simplifyDebts, memberBalances, expenses, settlements]);

  const categoryBreakdown = useMemo(() => {
    return calculateCategoryBreakdown(expenses);
  }, [expenses]);

  const totalGroupSpending = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const averagePerPerson = useMemo(() => {
    if (activeGroup.members.length === 0) return 0;
    return totalGroupSpending / activeGroup.members.length;
  }, [totalGroupSpending, activeGroup.members]);

  const circumference = 2 * Math.PI * 38;

  const donutSegments = useMemo(() => {
    return categoryBreakdown.map((item, index) => {
      const dashLength = (item.percentage / 100) * circumference;
      const priorSum = categoryBreakdown
        .slice(0, index)
        .reduce((sum, current) => sum + (current.percentage / 100) * circumference, 0);
      return {
        ...item,
        dashLength,
        offset: -priorSum,
      };
    });
  }, [categoryBreakdown, circumference]);

  const handleRemind = (debtor: string, amount: number) => {
    showToast(`Payment reminder sent to ${debtor} for $${amount.toFixed(2)}`);
  };

  const handlePay = (creditor: string, amount: number) => {
    setSettlePrefill({ recipient: creditor, amount });
    setIsSettleModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-6 px-4 md:px-6 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Spending Insights & Debt Flow
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analytics and optimal settlement graph for {activeGroup.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSimplifyDebts(!simplifyDebts)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            simplifyDebts
              ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/50 text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#065F46]'
              : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          Simplify Debts: {simplifyDebts ? 'On' : 'Off'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Total Group Outlay
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1 tabular-nums">
              {formatCurrency(totalGroupSpending, activeCurrency)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Average {formatCurrency(averagePerPerson, activeCurrency)} per person across {activeGroup.members.length} members
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Recorded transactions</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{expenses.length} records</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center">
          <span className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider self-start mb-2">
            Spending by Category
          </span>

          <div className="flex items-center justify-center relative py-2">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="11"
              />
              {donutSegments.map((item) => (
                <circle
                  key={item.category}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="11"
                  strokeDasharray={`${item.dashLength} ${circumference - item.dashLength}`}
                  strokeDashoffset={item.offset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Total</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatCurrency(totalGroupSpending, activeCurrency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full pt-2">
            {categoryBreakdown.map((item) => (
              <div key={item.category} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 dark:text-slate-300 capitalize truncate">
                  {item.category} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/50 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {simplifyDebts ? 'Optimized Debt Settlement Graph' : 'Direct Bilateral Obligations'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Minimum cash-flow payments</p>
            </div>
          </div>
          <span className="text-xs bg-[#D1FAE5] dark:bg-[#064E3B]/50 text-[#065F46] dark:text-[#A7F3D0] px-3 py-1 rounded-full font-semibold">
            {debts.length} {debts.length === 1 ? 'payment' : 'payments'}
          </span>
        </div>

        {debts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
            All balances in this ledger are settled up.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {debts.map((item, index) => {
              const isYouDebtor = isSelf(item.debtor);
              const isYouCreditor = isSelf(item.creditor);

              return (
                <div
                  key={`${item.debtor}-${item.creditor}-${index}`}
                  className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isYouDebtor ? 'text-[#E11D48] dark:text-[#FB7185]' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.debtor}{isYouDebtor && !item.debtor.includes('(You)') ? ' (You)' : ''}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span
                      className={`text-xs font-semibold truncate ${
                        isYouCreditor ? 'text-[#059669] dark:text-[#34D399]' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.creditor}{isYouCreditor && !item.creditor.includes('(You)') ? ' (You)' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatCurrency(item.amount, activeCurrency)}
                    </span>

                    {!isViewOnly && (
                      <>
                        {isYouDebtor && (
                          <button
                            type="button"
                            onClick={() => handlePay(item.creditor, item.amount)}
                            className="px-3 py-1 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-2xs active:scale-95"
                          >
                            Pay
                          </button>
                        )}
                        {isYouCreditor && (
                          <button
                            type="button"
                            onClick={() => handleRemind(item.debtor, item.amount)}
                            className="px-3 py-1 rounded-full bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all"
                          >
                            Remind
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
