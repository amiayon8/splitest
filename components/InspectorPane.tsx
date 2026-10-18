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
    <aside className="w-[340px] shrink-0 bg-white border-l border-slate-200/80 p-5 flex flex-col gap-5 overflow-y-auto thin-scrollbar hidden xl:flex select-none">
      <div className="flex items-center bg-[#F1F5F9] p-1 rounded-full border border-slate-200/60">
        {(['balances', 'spending', 'activity'] as const).map((tab) => {
          const isActive = activeInspectorTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveInspectorTab(tab)}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                isActive
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
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
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {simplifyDebts ? 'Debt Flow (Simplified)' : 'Direct Debts'}
              </span>
              <span className="text-[11px] text-[#065F46] font-semibold bg-[#D1FAE5] px-2.5 py-0.5 rounded-full">
                {debts.length} {debts.length === 1 ? 'payment' : 'payments'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {debts.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] text-center text-xs text-slate-400 border border-slate-200/60">
                  All debts in this ledger are settled.
                </div>
              ) : (
                debts.map((item, index) => {
                  const isYouDebtor = item.debtor === 'You';
                  const isYouCreditor = item.creditor === 'You';

                  return (
                    <div
                      key={`${item.debtor}-${item.creditor}-${index}`}
                      className="p-3.5 rounded-2xl bg-[#F8FAFC] flex items-center justify-between gap-2.5 border border-slate-200/80 shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isYouDebtor ? 'text-[#E11D48]' : 'text-slate-800'
                          }`}
                        >
                          {item.debtor}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span
                          className={`text-xs font-semibold truncate ${
                            isYouCreditor ? 'text-[#059669]' : 'text-slate-800'
                          }`}
                        >
                          {item.creditor}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-900 tabular-nums">
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
                                className="px-2.5 py-1 rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-all"
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

          <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Member Ledger ({activeGroup.members.length})
            </span>
            <div className="space-y-1.5">
              {activeGroup.members.map((member) => {
                const balance = memberBalances[member.name]?.netBalance || 0;
                return (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {member.name}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold tabular-nums shrink-0 ${
                        balance > 0
                          ? 'text-[#059669]'
                          : balance < 0
                          ? 'text-[#E11D48]'
                          : 'text-slate-400'
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
          <div className="flex flex-col items-center p-4 bg-[#F8FAFC] rounded-3xl border border-slate-200/80">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#E2E8F0"
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
                <span className="text-base font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(totalGroupSpending, activeCurrency)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Total Spent</span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-xs text-slate-500">
                Average per person: <strong>{formatCurrency(averagePerPerson, activeCurrency)}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Category Breakdown
            </span>
            <div className="space-y-1.5">
              {categoryBreakdown.map((item) => (
                <div
                  key={item.category}
                  className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-800 capitalize">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-slate-500">{item.percentage}%</span>
                    <span className="font-bold text-slate-900">
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
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Recent Activity
          </span>
          <div className="space-y-2">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex items-start gap-3 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{act.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{act.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedExpense && (
        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3">
          <div className="p-4 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-[#059669] shrink-0" />
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {selectedExpense.description}
                </h4>
              </div>
              <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(selectedExpense.amount, selectedExpense.currencyCode || activeCurrency)}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200/60">
              <div className="flex justify-between">
                <span>Paid by:</span>
                <span className="font-semibold text-slate-800">{selectedExpense.paidByName}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <LocalTime isoString={selectedExpense.date} format="short" />
              </div>
            </div>

            {selectedExpense.comments.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Comments ({selectedExpense.comments.length})
                </span>
                {selectedExpense.comments.map((comm) => (
                  <div key={comm.id} className="p-2 rounded-xl bg-white border border-slate-200/60 text-xs">
                    <span className="font-bold text-slate-800">{comm.authorName}: </span>
                    <span className="text-slate-600">{comm.content}</span>
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
                className="flex-1 h-8 px-3 rounded-full bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
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
