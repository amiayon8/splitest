'use client';

import React, { useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
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
  } = useSplitest();

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
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Activity & Expenses
          </h1>
          <span className="text-xs text-slate-500 mt-0.5">
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
          <div className="flex-1 flex items-center gap-2.5 bg-white px-4 py-2 rounded-full border border-slate-200/80 shadow-2xs focus-within:border-[#059669] transition-all">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses, members, amounts..."
              className="w-full bg-transparent border-none outline-none text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-full px-3 py-2 text-xs shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'latest' | 'highest' | 'lowest')}
              aria-label="Sort activity"
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="latest">Latest</option>
              <option value="highest">Highest</option>
              <option value="lowest">Lowest</option>
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
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No matching expenses</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or category filters.</p>
          </div>
        ) : (
          Object.entries(groupedByMonth).map(([month, monthExpenses]) => (
            <div key={month} className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                {month}
              </span>

              <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100 shadow-2xs">
                {monthExpenses.map((expense) => {
                  const IconComponent = getCategoryIcon(expense.category);
                  const isPayerYou = expense.paidByName === 'You';
                  const yourSplit = expense.splits.find((s) => s.memberName === 'You');

                  return (
                    <div
                      key={expense.id}
                      onClick={() => setSelectedExpenseId(expense.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#F1F5F9] text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {expense.description}
                            </span>
                            {expense.hasReceipt && (
                              <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            {isPayerYou ? 'You paid' : `${expense.paidByName} paid`}{' '}
                            <strong className="text-slate-700">{formatCurrency(expense.amount, expense.currencyCode || activeCurrency)}</strong>
                            {' • '}
                            <LocalTime isoString={expense.date} format="short" />
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isPayerYou ? (
                          <div>
                            <span className="text-[11px] font-semibold text-[#059669] block">you lent</span>
                            <span className="text-sm font-bold text-[#059669] tabular-nums">
                              +{formatCurrency(expense.amount - (yourSplit?.shareAmount || 0), activeCurrency)}
                            </span>
                          </div>
                        ) : yourSplit && yourSplit.shareAmount > 0 ? (
                          <div>
                            <span className="text-[11px] font-semibold text-[#E11D48] block">you borrowed</span>
                            <span className="text-sm font-bold text-[#E11D48] tabular-nums">
                              -{formatCurrency(yourSplit.shareAmount, activeCurrency)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">not involved</span>
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
