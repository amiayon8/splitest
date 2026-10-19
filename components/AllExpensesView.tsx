'use client';

import React, { useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { getCurrentUserMemberName, isMemberCurrentUser } from '@/lib/split-calculator';
import { LocalTime, formatMonthYear } from '@/lib/timezone';
import { Expense } from '@/types';
import {
  Search,
  Plus,
  Receipt,
  Palmtree,
  Utensils,
  Car,
  Compass,
  ShoppingBag,
  Tag,
  ArrowUpDown,
} from 'lucide-react';

export function AllExpensesView() {
  const {
    activeGroup,
    expenses,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortOrder,
    setSortOrder,
    setSelectedExpenseId,
    setIsAddExpenseModalOpen,
    isViewOnly,
    activeCurrency,
    userProfile,
  } = useSplitest();

  const currentMemberName = getCurrentUserMemberName(activeGroup, userProfile);
  const isSelf = (name: string) => isMemberCurrentUser(name, activeGroup, userProfile);

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
            isSelf(exp.paidByName) ||
            exp.splits.some((s) => isSelf(s.memberName) && s.shareAmount > 0)
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
  }, [expenses, searchQuery, selectedCategory, sortOrder, currentMemberName, userProfile]);

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

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
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
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-6 px-4 md:px-6 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Activity & Expenses
          </h1>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeGroup.name} • {filteredExpenses.length} transactions ({formatCurrency(totalFilteredAmount, activeCurrency)})
          </span>
        </div>

        {!isViewOnly && (
          <button
            type="button"
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-sm active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2.5 bg-white dark:bg-[#1E293B] px-4 py-2 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs focus-within:border-[#059669] dark:focus-within:border-[#10B981] transition-all">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses, members, amounts..."
              className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-full px-3 py-2 text-xs shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'latest' | 'highest' | 'lowest')}
              aria-label="Sort activity"
              className="bg-transparent font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="latest" className="dark:bg-[#1E293B] dark:text-slate-200">Latest</option>
              <option value="highest" className="dark:bg-[#1E293B] dark:text-slate-200">Highest</option>
              <option value="lowest" className="dark:bg-[#1E293B] dark:text-slate-200">Lowest</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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
      </div>

      <div className="flex flex-col gap-6">
        {Object.keys(groupedByMonth).length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
            <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching expenses</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search terms or category filters.</p>
          </div>
        ) : (
          Object.entries(groupedByMonth).map(([month, monthExpenses]) => (
            <div key={month} className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">
                {month}
              </span>

              <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
                {monthExpenses.map((expense) => {
                  const IconComponent = getCategoryIcon(expense.category);
                  const isPayerYou = isSelf(expense.paidByName);
                  const yourSplit = expense.splits.find((s) => isSelf(s.memberName));

                  return (
                    <div
                      key={expense.id}
                      onClick={() => setSelectedExpenseId(expense.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors"
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
