'use client';

import React, { useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { WalletCardDeck } from '@/components/WalletCardDeck';
import { formatCurrency } from '@/lib/currency';
import { getCurrentUserMemberName, isMemberCurrentUser } from '@/lib/split-calculator';
import { LocalTime } from '@/lib/timezone';
import { Expense } from '@/types';
import {
  Plus,
  Handshake,
  Receipt,
  Download,
  Palmtree,
  Utensils,
  Car,
  Compass,
  ShoppingBag,
  Tag,
  ArrowRight,
} from 'lucide-react';

export function WalletDashboard() {
  const {
    expenses,
    setSelectedExpenseId,
    setIsAddExpenseModalOpen,
    setIsSettleModalOpen,
    setCurrentView,
    exportGroupCsv,
    isViewOnly,
    activeCurrency,
    activeGroup,
    userProfile,
  } = useSplitest();

  const currentMemberName = getCurrentUserMemberName(activeGroup, userProfile);
  const isSelf = (name: string) => isMemberCurrentUser(name, activeGroup, userProfile);

  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [expenses]);

  const getCategoryIcon = (category: Expense['category']) => {
    switch (category) {
      case 'villa':
        return Palmtree;
      case 'dining':
        return Utensils;
      case 'transport':
        return Car;
      case 'activities':
        return Compass;
      case 'groceries':
        return ShoppingBag;
      default:
        return Tag;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-6 px-4 md:px-6 select-none">
      <WalletCardDeck />

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {!isViewOnly && (
          <>
            <button
              type="button"
              onClick={() => setIsAddExpenseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-sm shrink-0 active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Expense</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all shadow-2xs shrink-0"
            >
              <Handshake className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
              <span>Settle Up</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={exportGroupCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all shadow-2xs shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Recent Activity
          </span>
          <button
            type="button"
            onClick={() => setCurrentView('expenses')}
            className="text-xs font-semibold text-[#059669] dark:text-[#34D399] hover:text-[#047857] flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-10 text-center border border-slate-200/80 dark:border-slate-800">
            <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No activity yet</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Expenses added to this ledger will show up here.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs overflow-hidden">
            {recentExpenses.map((expense) => {
              const IconComponent = getCategoryIcon(expense.category);
              const isPayerYou = isSelf(expense.paidByName);
              const yourSplit = expense.splits.find((s) => isSelf(s.memberName));

              return (
                <div
                  key={expense.id}
                  onClick={() => setSelectedExpenseId(expense.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#F1F5F9] dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-800">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {expense.description}
                        </span>
                        {expense.hasReceipt && (
                          <Receipt className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                        {isPayerYou ? 'You paid' : `${expense.paidByName} paid`}{' '}
                        <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(expense.amount, expense.currencyCode || activeCurrency)}</strong>
                        {' • '}
                        <LocalTime isoString={expense.date} format="short" />
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isPayerYou ? (
                      <div>
                        <span className="text-[11px] font-semibold text-[#059669] dark:text-[#34D399] block">you lent</span>
                        <span className="text-sm font-bold text-[#059669] dark:text-[#34D399] tabular-nums">
                          +{formatCurrency(expense.amount - (yourSplit?.shareAmount || 0), activeCurrency)}
                        </span>
                      </div>
                    ) : yourSplit && yourSplit.shareAmount > 0 ? (
                      <div>
                        <span className="text-[11px] font-semibold text-[#E11D48] dark:text-[#FB7185] block">you borrowed</span>
                        <span className="text-sm font-bold text-[#E11D48] dark:text-[#FB7185] tabular-nums">
                          -{formatCurrency(yourSplit.shareAmount, activeCurrency)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">not involved</span>
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
