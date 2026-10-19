'use client';

import React, { useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { LocalTime, formatMonthYear } from '@/lib/timezone';
import { WalletCardDeck } from '@/components/WalletCardDeck';
import { calculateMemberBalances } from '@/lib/split-calculator';
import { Expense } from '@/types';
import {
  Share2,
  Handshake,
  Plus,
  Receipt,
  Utensils,
  ShoppingBag,
  Car,
  Palmtree,
  Compass,
  Tag,
  Shield,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';

export function ExpenseFeed() {
  const {
    activeGroup,
    expenses,
    settlements,
    selectedExpenseId,
    setSelectedExpenseId,
    simplifyDebts,
    setSimplifyDebts,
    searchQuery,
    selectedCategory,
    setSelectedCategory,
    sortOrder,
    setSortOrder,
    setIsAddExpenseModalOpen,
    setIsSettleModalOpen,
    setIsShareModalOpen,
    setIsLedgerSettingsModalOpen,
    isViewOnly,
    activeCurrency,
  } = useSplitest();

  const memberNames = useMemo(() => activeGroup.members.map((m) => m.name), [activeGroup]);

  const memberBalances = useMemo(() => {
    return calculateMemberBalances(memberNames, expenses, settlements);
  }, [memberNames, expenses, settlements]);

  const yourBalance = memberBalances['You']?.netBalance || 0;

  const totalYouOwe = useMemo(() => {
    let total = 0;
    for (const exp of expenses) {
      if (exp.paidByName !== 'You') {
        const yourSplit = exp.splits.find((s) => s.memberName === 'You');
        if (yourSplit) {
          total += yourSplit.shareAmount;
        }
      }
    }
    for (const settle of settlements) {
      if (settle.payerName === 'You') {
        total -= settle.amount;
      }
    }
    return Math.max(0, Math.round(total * 100) / 100);
  }, [expenses, settlements]);

  const totalYouAreOwed = useMemo(() => {
    let total = 0;
    for (const exp of expenses) {
      if (exp.paidByName === 'You') {
        for (const split of exp.splits) {
          if (split.memberName !== 'You') {
            total += split.shareAmount;
          }
        }
      }
    }
    for (const settle of settlements) {
      if (settle.recipientName === 'You') {
        total -= settle.amount;
      }
    }
    return Math.max(0, Math.round(total * 100) / 100);
  }, [expenses, settlements]);

  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (exp) =>
          exp.description.toLowerCase().includes(q) ||
          exp.paidByName.toLowerCase().includes(q) ||
          exp.amount.toString().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'mine') {
        list = list.filter(
          (exp) =>
            exp.paidByName === 'You' ||
            exp.splits.some((s) => s.memberName === 'You' && s.shareAmount > 0)
        );
      } else {
        list = list.filter((exp) => exp.category === selectedCategory);
      }
    }

    if (sortOrder === 'latest') {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortOrder === 'highest') {
      list.sort((a, b) => b.amount - a.amount);
    } else if (sortOrder === 'lowest') {
      list.sort((a, b) => a.amount - b.amount);
    }

    return list;
  }, [expenses, searchQuery, selectedCategory, sortOrder]);

  const groupedByMonth = useMemo(() => {
    const groupsMap: Record<string, Expense[]> = {};
    for (const exp of filteredExpenses) {
      const monthKey = formatMonthYear(exp.date) || 'Recent';
      if (!groupsMap[monthKey]) {
        groupsMap[monthKey] = [];
      }
      groupsMap[monthKey].push(exp);
    }
    return groupsMap;
  }, [filteredExpenses]);

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
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#090D16] select-none transition-colors duration-150">
      <div className="bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 sticky top-16 z-30 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[220px] sm:max-w-none">
                  {activeGroup.name}
                </h1>
                {isViewOnly ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0">
                    <Shield className="w-3 h-3" />
                    View Only
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#D1FAE5] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#059669] shrink-0">
                    {activeGroup.userRole === 'owner' ? 'Owner' : 'Editor'}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[260px] sm:max-w-none">
                {activeGroup.description || 'Shared Expense Ledger'}
              </p>
            </div>

            <div className="flex -space-x-2 overflow-hidden items-center sm:hidden shrink-0">
              {activeGroup.members.slice(0, 4).map((member) => (
                <img
                  key={member.id}
                  src={member.avatarUrl}
                  alt={member.name}
                  title={member.name}
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-[#0F172A] object-cover shadow-2xs"
                />
              ))}
              {activeGroup.members.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#0F172A] flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
                  +{activeGroup.members.length - 4}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex -space-x-2 overflow-hidden items-center mr-1">
              {activeGroup.members.slice(0, 5).map((member) => (
                <img
                  key={member.id}
                  src={member.avatarUrl}
                  alt={member.name}
                  title={member.name}
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0F172A] object-cover shadow-2xs"
                />
              ))}
              {activeGroup.members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#0F172A] flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
                  +{activeGroup.members.length - 5}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsLedgerSettingsModalOpen(true)}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Ledger Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {!isViewOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(true)}
                  className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-full bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors ml-auto sm:ml-0"
                >
                  <Handshake className="w-4 h-4 text-[#059669] dark:text-[#10B981]" />
                  <span>Settle Up</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="hidden sm:flex h-10 px-4 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold items-center gap-1.5 shadow-sm active:scale-98 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Expense</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <WalletCardDeck />

        <div className="hidden md:grid md:grid-cols-3 gap-3.5">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Position</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${
                  yourBalance > 0
                    ? 'text-[#059669] dark:text-[#10B981]'
                    : yourBalance < 0
                    ? 'text-[#E11D48] dark:text-[#F43F5E]'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {yourBalance > 0
                  ? `+${formatCurrency(yourBalance, activeCurrency)}`
                  : yourBalance < 0
                  ? `-${formatCurrency(Math.abs(yourBalance), activeCurrency)}`
                  : formatCurrency(0, activeCurrency)}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {yourBalance > 0
                ? 'You are owed in total'
                : yourBalance < 0
                ? 'You owe in total'
                : 'All debts settled'}
            </p>
          </div>

          <div className="bg-[#FFE4E6]/60 dark:bg-[#881337]/30 rounded-3xl p-5 border border-[#FECDD3] dark:border-[#9F1239] shadow-xs transition-colors">
            <span className="text-xs font-semibold text-[#9F1239] dark:text-[#FECDD3] uppercase tracking-wider">You Owe</span>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#9F1239] dark:text-[#FECDD3] tabular-nums tracking-tight">
                {formatCurrency(totalYouOwe, activeCurrency)}
              </span>
            </div>
            <p className="text-xs text-[#9F1239]/80 dark:text-[#FECDD3]/80 mt-1">Pending payments to members</p>
          </div>

          <div className="bg-[#D1FAE5]/60 dark:bg-[#064E3B]/30 rounded-3xl p-5 border border-[#A7F3D0] dark:border-[#047857] shadow-xs transition-colors">
            <span className="text-xs font-semibold text-[#065F46] dark:text-[#A7F3D0] uppercase tracking-wider">You Are Owed</span>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#065F46] dark:text-[#A7F3D0] tabular-nums tracking-tight">
                {formatCurrency(totalYouAreOwed, activeCurrency)}
              </span>
            </div>
            <p className="text-xs text-[#065F46]/80 dark:text-[#A7F3D0]/80 mt-1">Pending reimbursements</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'mine', label: 'My Expenses' },
              { id: 'dining', label: 'Dining' },
              { id: 'transport', label: 'Transport' },
              { id: 'activities', label: 'Activities' },
              { id: 'villa', label: 'Lodging' },
            ].map((chip) => {
              const isSelected = selectedCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#059669] text-white shadow-2xs'
                      : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'latest' | 'highest' | 'lowest')}
                aria-label="Sort expenses"
                className="bg-transparent font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="latest" className="dark:bg-[#1E293B] dark:text-slate-100">Latest first</option>
                <option value="highest" className="dark:bg-[#1E293B] dark:text-slate-100">Highest amount</option>
                <option value="lowest" className="dark:bg-[#1E293B] dark:text-slate-100">Lowest amount</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSimplifyDebts(!simplifyDebts)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                simplifyDebts
                  ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#059669]'
                  : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Simplify Debts: {simplifyDebts ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {Object.keys(groupedByMonth).length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 transition-colors">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No expenses recorded</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Expenses added to this ledger will appear here.</p>
            </div>
          ) : (
            Object.entries(groupedByMonth).map(([month, monthExpenses]) => (
              <div key={month} className="space-y-2">
                <div className="px-2">
                  <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{month}</h2>
                </div>

                <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 shadow-2xs transition-colors">
                  {monthExpenses.map((expense) => {
                    const isSelected = selectedExpenseId === expense.id;
                    const IconComponent = getCategoryIcon(expense.category);
                    const isPayerYou = expense.paidByName === 'You';
                    const yourSplit = expense.splits.find((s) => s.memberName === 'You');

                    return (
                      <div
                        key={expense.id}
                        onClick={() => setSelectedExpenseId(expense.id)}
                        className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-slate-50/90 dark:bg-slate-800/80' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {expense.description}
                              </h3>
                              {expense.hasReceipt && (
                                <Receipt className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {isPayerYou ? 'You paid' : `${expense.paidByName} paid`}{' '}
                              <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(expense.amount, expense.currencyCode || activeCurrency)}</strong>
                              {' • '}
                              <LocalTime isoString={expense.date} format="short" />
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isPayerYou ? (
                            <div>
                              <span className="text-[11px] font-semibold text-[#059669] dark:text-[#10B981] block">you lent</span>
                              <span className="text-sm font-bold text-[#059669] dark:text-[#10B981] tabular-nums">
                                +{formatCurrency(expense.amount - (yourSplit?.shareAmount || 0), activeCurrency)}
                              </span>
                            </div>
                          ) : yourSplit && yourSplit.shareAmount > 0 ? (
                            <div>
                              <span className="text-[11px] font-semibold text-[#E11D48] dark:text-[#F43F5E] block">you borrowed</span>
                              <span className="text-sm font-bold text-[#E11D48] dark:text-[#F43F5E] tabular-nums">
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
