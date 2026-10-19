'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSplitest } from '@/lib/store';
import { Expense } from '@/types';
import { getCurrencyInfo } from '@/lib/currency';
import { serializeToUtc } from '@/lib/timezone';
import { getCurrentUserMemberName } from '@/lib/split-calculator';
import {
  X,
  Check,
  Receipt,
  Equal,
  DollarSign,
  Percent,
  Layers,
} from 'lucide-react';

export function AddExpenseModal() {
  const {
    activeGroup,
    userProfile,
    isAddExpenseModalOpen,
    setIsAddExpenseModalOpen,
    addExpense,
    showToast,
  } = useSplitest();

  const currentUserName = useMemo(
    () => getCurrentUserMemberName(activeGroup, userProfile),
    [activeGroup, userProfile]
  );

  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState<Expense['category']>('dining');
  const [paidBy, setPaidBy] = useState(currentUserName);

  useEffect(() => {
    if (isAddExpenseModalOpen) {
      setPaidBy(currentUserName);
    }
  }, [isAddExpenseModalOpen, currentUserName]);
  const [splitMethod, setSplitMethod] = useState<Expense['splitMethod']>('equal');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(() =>
    activeGroup ? activeGroup.members.map((m) => m.name) : []
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, number>>({});

  const groupBaseCurrency = activeGroup.defaultCurrency || 'USD';
  const groupCurrencyInfo = useMemo(() => getCurrencyInfo(groupBaseCurrency), [groupBaseCurrency]);

  const parsedTotalAmount = useMemo(() => {
    const parsed = parseFloat(amountInput);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amountInput]);

  const activeMembersList = useMemo(() => {
    const groupMemberNames = activeGroup.members.map((m) => m.name);
    return selectedMembers.filter((m) => groupMemberNames.includes(m));
  }, [activeGroup, selectedMembers]);

  const effectiveSelectedMembers = activeMembersList.length > 0
    ? activeMembersList
    : activeGroup.members.map((m) => m.name);

  const computedSplits = useMemo(() => {
    const count = effectiveSelectedMembers.length;
    if (count === 0 || parsedTotalAmount === 0) return [];

    if (splitMethod === 'equal') {
      const perPerson = Math.round((parsedTotalAmount / count) * 100) / 100;
      let runningSum = 0;

      return effectiveSelectedMembers.map((member, index) => {
        let share = perPerson;
        if (index === count - 1) {
          share = Math.round((parsedTotalAmount - runningSum) * 100) / 100;
        } else {
          runningSum += perPerson;
        }
        return {
          memberName: member,
          shareAmount: Math.max(0, share),
        };
      });
    }

    if (splitMethod === 'exact') {
      return effectiveSelectedMembers.map((member) => {
        const val = parseFloat(exactAmounts[member] || '0') || 0;
        return {
          memberName: member,
          shareAmount: val,
        };
      });
    }

    if (splitMethod === 'percentage') {
      return effectiveSelectedMembers.map((member) => {
        const pct = parseFloat(percentages[member] || '0') || 0;
        const val = Math.round(((pct / 100) * parsedTotalAmount) * 100) / 100;
        return {
          memberName: member,
          shareAmount: val,
          percentage: pct,
        };
      });
    }

    if (splitMethod === 'shares') {
      let totalShares = 0;
      for (const m of effectiveSelectedMembers) {
        totalShares += shares[m] || 1;
      }
      if (totalShares === 0) totalShares = 1;

      let runningSum = 0;
      return effectiveSelectedMembers.map((member, index) => {
        const memberShare = shares[member] || 1;
        let val = Math.round(((memberShare / totalShares) * parsedTotalAmount) * 100) / 100;
        if (index === effectiveSelectedMembers.length - 1) {
          val = Math.round((parsedTotalAmount - runningSum) * 100) / 100;
        } else {
          runningSum += val;
        }
        return {
          memberName: member,
          shareAmount: Math.max(0, val),
          shares: memberShare,
        };
      });
    }

    return [];
  }, [effectiveSelectedMembers, parsedTotalAmount, splitMethod, exactAmounts, percentages, shares]);

  const allocatedTotal = useMemo(() => {
    return computedSplits.reduce((acc, s) => acc + s.shareAmount, 0);
  }, [computedSplits]);

  const remainingBalance = useMemo(() => {
    return Math.round((parsedTotalAmount - allocatedTotal) * 100) / 100;
  }, [parsedTotalAmount, allocatedTotal]);

  const isFormValid = useMemo(() => {
    if (!description.trim()) return false;
    if (parsedTotalAmount <= 0) return false;
    if (effectiveSelectedMembers.length === 0) return false;

    if (splitMethod === 'exact') {
      return Math.abs(remainingBalance) < 0.02;
    }
    if (splitMethod === 'percentage') {
      const sumPct = effectiveSelectedMembers.reduce((acc, m) => acc + (parseFloat(percentages[m] || '0') || 0), 0);
      return Math.abs(sumPct - 100) < 0.1;
    }
    return true;
  }, [description, parsedTotalAmount, effectiveSelectedMembers, splitMethod, remainingBalance, percentages]);

  if (!isAddExpenseModalOpen) return null;

  const handleMemberToggle = (name: string) => {
    if (selectedMembers.includes(name)) {
      if (selectedMembers.length > 1) {
        setSelectedMembers(selectedMembers.filter((m) => m !== name));
      }
    } else {
      setSelectedMembers([...selectedMembers, name]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    await addExpense({
      groupId: activeGroup.id,
      description: description.trim(),
      amount: parsedTotalAmount,
      currencyCode: groupBaseCurrency,
      exchangeRateToGroup: 1.0,
      category,
      paidByName: paidBy,
      splitMethod,
      date: serializeToUtc(),
      hasReceipt,
      splits: computedSplits,
    });

    setIsAddExpenseModalOpen(false);
    showToast(`Added "${description.trim()}"`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-[#0F172A] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add an expense</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">With {activeGroup.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddExpenseModalOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto thin-scrollbar flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <input
              type="text"
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery run, Villa rental, Dinner"
              required
              className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Amount ({groupBaseCurrency})
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-sm font-bold text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                {groupCurrencyInfo.symbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                required
                className="w-full h-12 pl-9 pr-16 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-base font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981] tabular-nums"
              />
              <span className="absolute right-4 text-xs font-bold text-slate-500 dark:text-slate-400 pointer-events-none select-none uppercase">
                {groupBaseCurrency}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Paid by</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                aria-label="Select who paid for the expense"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
              >
                {activeGroup.members.map((m) => {
                  const isSelf = m.name === currentUserName || m.name === 'You' || m.isCurrentUser;
                  return (
                    <option key={m.id} value={m.name} className="dark:bg-[#1E293B] dark:text-slate-200">
                      {m.name}{isSelf && m.name !== 'You' ? ' (You)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Expense['category'])}
                aria-label="Select expense category"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
              >
                <option value="dining" className="dark:bg-[#1E293B] dark:text-slate-200">Dining & Drinks</option>
                <option value="groceries" className="dark:bg-[#1E293B] dark:text-slate-200">Groceries</option>
                <option value="transport" className="dark:bg-[#1E293B] dark:text-slate-200">Transport</option>
                <option value="activities" className="dark:bg-[#1E293B] dark:text-slate-200">Activities</option>
                <option value="villa" className="dark:bg-[#1E293B] dark:text-slate-200">Lodging</option>
                <option value="general" className="dark:bg-[#1E293B] dark:text-slate-200">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Split method</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F1F5F9] dark:bg-[#1E293B] rounded-2xl border border-slate-200/60 dark:border-slate-800">
              {[
                { id: 'equal', label: 'Equal', icon: Equal },
                { id: 'exact', label: 'Exact', icon: DollarSign },
                { id: 'percentage', label: 'Percent', icon: Percent },
                { id: 'shares', label: 'Shares', icon: Layers },
              ].map((tab) => {
                const isActive = splitMethod === tab.id;
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSplitMethod(tab.id as Expense['splitMethod'])}
                    className={`h-9 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Split amongst members</span>
              {splitMethod === 'exact' && (
                <span className={`text-xs font-semibold tabular-nums ${Math.abs(remainingBalance) < 0.02 ? 'text-[#059669] dark:text-[#34D399]' : 'text-[#E11D48] dark:text-[#FB7185]'}`}>
                  {remainingBalance === 0 ? 'Fully allocated' : `${groupCurrencyInfo.symbol}${remainingBalance.toFixed(2)} remaining`}
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar pr-1">
              {activeGroup.members.map((member) => {
                const isSelected = effectiveSelectedMembers.includes(member.name);
                const splitItem = computedSplits.find((s) => s.memberName === member.name);

                return (
                  <div
                    key={member.id}
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700' : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleMemberToggle(member.name)}
                      className="flex items-center gap-2.5 text-left flex-1"
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-[#059669] border-[#059669] text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0F172A]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-3" />}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.name}</span>
                    </button>

                    {splitMethod === 'exact' && isSelected && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{groupCurrencyInfo.symbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={exactAmounts[member.name] || ''}
                          onChange={(e) =>
                            setExactAmounts({ ...exactAmounts, [member.name]: e.target.value })
                          }
                          className="w-20 h-8 px-2 text-xs rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-right tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
                        />
                      </div>
                    )}

                    {splitMethod === 'percentage' && isSelected && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          placeholder="0"
                          value={percentages[member.name] || ''}
                          onChange={(e) =>
                            setPercentages({ ...percentages, [member.name]: e.target.value })
                          }
                          className="w-16 h-8 px-2 text-xs rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-right tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
                        />
                        <span className="text-xs text-slate-400 dark:text-slate-500">%</span>
                      </div>
                    )}

                    {splitMethod === 'shares' && isSelected && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={shares[member.name] || 1}
                          onChange={(e) =>
                            setShares({ ...shares, [member.name]: parseInt(e.target.value) || 1 })
                          }
                          className="w-14 h-8 px-2 text-xs rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-right tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
                        />
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">share(s)</span>
                      </div>
                    )}

                    {splitMethod === 'equal' && isSelected && splitItem && (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                        {groupCurrencyInfo.symbol}{splitItem.shareAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={hasReceipt}
                onChange={(e) => setHasReceipt(e.target.checked)}
                className="w-4 h-4 rounded text-[#059669] focus:ring-[#059669]"
              />
              <Receipt className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Receipt attached
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid}
              className="w-full h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold flex items-center justify-center transition-all shadow-sm active:scale-98 disabled:opacity-40"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
