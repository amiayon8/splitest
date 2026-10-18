'use client';

import React, { useState, useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { Expense } from '@/types';
import { SUPPORTED_CURRENCIES, getExchangeRate } from '@/lib/currency';
import { serializeToUtc } from '@/lib/timezone';
import {
  X,
  ChevronDown,
  Check,
  Receipt,
  Equal,
  DollarSign,
  Percent,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';

export function AddExpenseModal() {
  const {
    activeGroup,
    isAddExpenseModalOpen,
    setIsAddExpenseModalOpen,
    addExpense,
    showToast,
  } = useSplitest();

  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [currencyCode, setCurrencyCode] = useState(() => activeGroup.defaultCurrency || 'USD');
  const [customRate, setCustomRate] = useState<string>('');
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [category, setCategory] = useState<Expense['category']>('dining');
  const [paidBy, setPaidBy] = useState('You');
  const [splitMethod, setSplitMethod] = useState<Expense['splitMethod']>('equal');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(() =>
    activeGroup ? activeGroup.members.map((m) => m.name) : []
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, number>>({});

  const groupBaseCurrency = activeGroup.defaultCurrency || 'USD';
  const isDifferentCurrency = currencyCode !== groupBaseCurrency;

  const effectiveExchangeRate = useMemo(() => {
    if (!isDifferentCurrency) return 1.0;
    const parsedCustom = parseFloat(customRate);
    if (!isNaN(parsedCustom) && parsedCustom > 0) return parsedCustom;
    return getExchangeRate(currencyCode, groupBaseCurrency);
  }, [currencyCode, groupBaseCurrency, isDifferentCurrency, customRate]);

  const parsedTotalAmount = useMemo(() => {
    const parsed = parseFloat(amountInput);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amountInput]);

  const baseConvertedAmount = useMemo(() => {
    return Math.round(parsedTotalAmount * effectiveExchangeRate * 100) / 100;
  }, [parsedTotalAmount, effectiveExchangeRate]);

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
      currencyCode,
      exchangeRateToGroup: effectiveExchangeRate,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add an expense</h2>
            <p className="text-xs text-slate-500 mt-0.5">With {activeGroup.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddExpenseModalOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto thin-scrollbar flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
            <input
              type="text"
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery run, Villa rental, Dinner"
              required
              className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount & Currency</label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                  className="h-12 px-3.5 rounded-2xl bg-[#F1F5F9] border border-slate-200 text-sm font-bold text-slate-800 flex items-center gap-1.5 hover:bg-slate-200/70"
                >
                  <span>{currencyCode}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {isCurrencyOpen && (
                  <div className="absolute left-0 mt-1 w-44 bg-white rounded-2xl border border-slate-200 shadow-xl py-1 z-50">
                    <div className="max-h-52 overflow-y-auto thin-scrollbar">
                      {SUPPORTED_CURRENCIES.map((curr) => (
                        <button
                          key={curr.code}
                          type="button"
                          onClick={() => {
                            setCurrencyCode(curr.code);
                            setIsCurrencyOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                            currencyCode === curr.code ? 'font-bold text-[#059669] bg-[#D1FAE5]/30' : 'text-slate-700'
                          }`}
                        >
                          <span>{curr.code} ({curr.symbol})</span>
                          <span className="text-[10px] text-slate-400">{curr.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-12 px-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] tabular-nums"
                />
              </div>
            </div>

            {isDifferentCurrency && (
              <div className="mt-2 p-3 bg-[#F1F5F9] rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#059669]" />
                  <span className="text-slate-600">
                    Converts to <strong>${baseConvertedAmount.toFixed(2)} {groupBaseCurrency}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Rate:</span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder={effectiveExchangeRate.toFixed(4)}
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    className="w-20 h-7 px-2 text-xs rounded-lg bg-white border border-slate-200 text-right font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Paid by</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                aria-label="Select who paid for the expense"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#059669]"
              >
                {activeGroup.members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name === 'You' ? 'You' : m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Expense['category'])}
                aria-label="Select expense category"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#059669]"
              >
                <option value="dining">Dining & Drinks</option>
                <option value="groceries">Groceries</option>
                <option value="transport">Transport</option>
                <option value="activities">Activities</option>
                <option value="villa">Lodging</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Split method</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F1F5F9] rounded-2xl border border-slate-200/60">
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
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
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
              <span className="text-xs font-semibold text-slate-700">Split amongst members</span>
              {splitMethod === 'exact' && (
                <span className={`text-xs font-semibold tabular-nums ${Math.abs(remainingBalance) < 0.02 ? 'text-[#059669]' : 'text-[#E11D48]'}`}>
                  {remainingBalance === 0 ? 'Fully allocated' : `$${remainingBalance.toFixed(2)} remaining`}
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
                      isSelected ? 'bg-white border-slate-200' : 'bg-slate-50/60 border-slate-100 opacity-60'
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
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{member.name}</span>
                    </button>

                    {splitMethod === 'exact' && isSelected && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={exactAmounts[member.name] || ''}
                          onChange={(e) =>
                            setExactAmounts({ ...exactAmounts, [member.name]: e.target.value })
                          }
                          className="w-20 h-8 px-2 text-xs rounded-xl bg-[#F8FAFC] border border-slate-200 text-right tabular-nums focus:outline-none focus:border-[#059669]"
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
                          className="w-16 h-8 px-2 text-xs rounded-xl bg-[#F8FAFC] border border-slate-200 text-right tabular-nums focus:outline-none focus:border-[#059669]"
                        />
                        <span className="text-xs text-slate-400">%</span>
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
                          className="w-14 h-8 px-2 text-xs rounded-xl bg-[#F8FAFC] border border-slate-200 text-right tabular-nums focus:outline-none focus:border-[#059669]"
                        />
                        <span className="text-[11px] text-slate-400">share(s)</span>
                      </div>
                    )}

                    {splitMethod === 'equal' && isSelected && splitItem && (
                      <span className="text-xs font-semibold text-slate-600 tabular-nums">
                        ${splitItem.shareAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={hasReceipt}
                onChange={(e) => setHasReceipt(e.target.checked)}
                className="w-4 h-4 rounded text-[#059669] focus:ring-[#059669]"
              />
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
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
