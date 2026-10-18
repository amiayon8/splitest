'use client';

import React, { useState, useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { LocalTime } from '@/lib/timezone';
import {
  calculateMemberBalances,
  calculateSimplifiedDebts,
  calculateDirectDebts,
  calculateCategoryBreakdown,
} from '@/lib/split-calculator';
import {
  ArrowRight,
  Send,
  Receipt,
  MessageSquare,
  SlidersHorizontal,
} from 'lucide-react';

export function InspectorPane() {
  const {
    activeGroup,
    expenses,
    settlements,
    selectedExpense,
    simplifyDebts,
    activeInspectorTab,
    setActiveInspectorTab,
    activities,
    setIsSettleModalOpen,
    setSettlePrefill,
    addComment,
    showToast,
    isViewOnly,
    activeCurrency,
    setIsLedgerSettingsModalOpen,
  } = useSplitest();

  const [commentText, setCommentText] = useState('');

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

  const handleRemindDebt = (debtor: string, amount: number) => {
    showToast(`Payment reminder sent to ${debtor} for $${amount.toFixed(2)}`);
  };

  const handlePayDebt = (creditor: string, amount: number) => {
    setSettlePrefill({ recipient: creditor, amount });
    setIsSettleModalOpen(true);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !selectedExpense) return;
    const content = commentText.trim();
    setCommentText('');
    await addComment(selectedExpense.id, content, 'You');
  };

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

  return (
    <aside className="w-[340px] shrink-0 bg-white dark:bg-[#0F172A] border-l border-slate-200/80 dark:border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto thin-scrollbar hidden xl:flex select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center font-bold text-xs shrink-0">
            {activeGroup.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {activeGroup.name}
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Currency: {activeCurrency}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLedgerSettingsModalOpen(true)}
          className="h-7 px-2.5 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
          title="Ledger Settings"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Settings</span>
        </button>
      </div>

      <div className="flex items-center bg-[#F1F5F9] dark:bg-[#1E293B] p-1 rounded-full border border-slate-200/60 dark:border-slate-800">
        {(['balances', 'spending', 'activity'] as const).map((tab) => {
          const isActive = activeInspectorTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveInspectorTab(tab)}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                isActive
                  ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {activeInspectorTab === 'balances' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                {simplifyDebts ? 'Debt Flow (Simplified)' : 'Direct Debts'}
              </span>
              <span className="text-[11px] text-[#065F46] dark:text-[#A7F3D0] font-semibold bg-[#D1FAE5] dark:bg-[#064E3B]/50 px-2.5 py-0.5 rounded-full">
                {debts.length} {debts.length === 1 ? 'payment' : 'payments'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {debts.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 text-center text-xs text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-800">
                  All debts in this ledger are settled.
                </div>
              ) : (
                debts.map((item, index) => {
                  const isYouDebtor = item.debtor === 'You';
                  const isYouCreditor = item.creditor === 'You';

                  return (
                    <div
                      key={`${item.debtor}-${item.creditor}-${index}`}
                      className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B]/60 flex items-center justify-between gap-2.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isYouDebtor ? 'text-[#E11D48] dark:text-[#FB7185]' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {item.debtor}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span
                          className={`text-xs font-semibold truncate ${
                            isYouCreditor ? 'text-[#059669] dark:text-[#34D399]' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {item.creditor}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatCurrency(item.amount, activeCurrency)}
                        </span>

                        {!isViewOnly && (
                          <>
                            {isYouDebtor && (
                              <button
                                type="button"
                                onClick={() => handlePayDebt(item.creditor, item.amount)}
                                className="px-2.5 py-1 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-semibold transition-all shadow-2xs active:scale-95"
                              >
                                Settle
                              </button>
                            )}
                            {isYouCreditor && (
                              <button
                                type="button"
                                onClick={() => handleRemindDebt(item.debtor, item.amount)}
                                className="px-2.5 py-1 rounded-full bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-all"
                              >
                                Remind
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Member Ledger ({activeGroup.members.length})
            </span>
            <div className="space-y-1.5">
              {activeGroup.members.map((member) => {
                const balance = memberBalances[member.name]?.netBalance || 0;
                return (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {member.name}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold tabular-nums shrink-0 ${
                        balance > 0
                          ? 'text-[#059669] dark:text-[#34D399]'
                          : balance < 0
                          ? 'text-[#E11D48] dark:text-[#FB7185]'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {balance > 0
                        ? `+${formatCurrency(balance, activeCurrency)}`
                        : balance < 0
                        ? `-${formatCurrency(Math.abs(balance), activeCurrency)}`
                        : 'Settled'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeInspectorTab === 'spending' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center p-4 bg-[#F8FAFC] dark:bg-[#1E293B]/60 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="10"
                />
                {donutSegments.map((segment, index) => (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="10"
                    strokeDasharray={`${segment.dashLength} ${circumference}`}
                    strokeDashoffset={segment.offset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatCurrency(totalGroupSpending, activeCurrency)}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Total Spent</span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Average per person: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(averagePerPerson, activeCurrency)}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Category Breakdown
            </span>
            <div className="space-y-1.5">
              {categoryBreakdown.map((item) => (
                <div
                  key={item.category}
                  className="p-2.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-slate-500 dark:text-slate-400">{item.percentage}%</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.total, activeCurrency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeInspectorTab === 'activity' && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Recent Activity
          </span>
          <div className="space-y-2">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-xl bg-[#D1FAE5] dark:bg-[#064E3B]/50 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{act.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{act.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedExpense && (
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <div className="p-4 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-[#059669] dark:text-[#34D399] shrink-0" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {selectedExpense.description}
                </h4>
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatCurrency(selectedExpense.amount, selectedExpense.currencyCode || activeCurrency)}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex justify-between">
                <span>Paid by:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedExpense.paidByName}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <LocalTime isoString={selectedExpense.date} format="short" />
              </div>
            </div>

            {selectedExpense.comments.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Comments ({selectedExpense.comments.length})
                </span>
                {selectedExpense.comments.map((comm) => (
                  <div key={comm.id} className="p-2 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200/60 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{comm.authorName}: </span>
                    <span className="text-slate-600 dark:text-slate-300">{comm.content}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                placeholder="Add comment..."
                className="flex-1 h-8 px-3 rounded-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
              />
              <button
                type="button"
                onClick={handleSendComment}
                className="w-8 h-8 rounded-full bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center shrink-0 active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
