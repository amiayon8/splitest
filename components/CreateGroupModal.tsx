'use client';

import React, { useState } from 'react';
import { useSplitest } from '@/lib/store';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { X, Users, Check } from 'lucide-react';

export function CreateGroupModal() {
  const {
    isNewGroupModalOpen,
    setIsNewGroupModalOpen,
    createGroup,
    showToast,
    activeCurrency,
  } = useSplitest();

  const [groupName, setGroupName] = useState('');
  const [category, setCategory] = useState('Trip');
  const [currency, setCurrency] = useState(activeCurrency || 'USD');
  const [membersInput, setMembersInput] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) return;

    const parsedMembers = membersInput
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    await createGroup(groupName.trim(), category, 'Users', parsedMembers);
    showToast(`Created group "${groupName.trim()}"`);
    setGroupName('');
    setMembersInput('');
    setIsNewGroupModalOpen(false);
  };

  if (!isNewGroupModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-5 border border-slate-200/80 dark:border-slate-800 max-h-[90vh] overflow-y-auto thin-scrollbar">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/50 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">New Group Ledger</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create a shared space for expenses</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNewGroupModalOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Summer Trip, Apartment 4B, Project Team"
              required
              className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Select ledger category"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
              >
                <option value="Trip" className="dark:bg-[#1E293B] dark:text-slate-200">Trip / Travel</option>
                <option value="Home" className="dark:bg-[#1E293B] dark:text-slate-200">Home / Rent</option>
                <option value="Couple" className="dark:bg-[#1E293B] dark:text-slate-200">Couple / Partner</option>
                <option value="Work" className="dark:bg-[#1E293B] dark:text-slate-200">Work / Project</option>
                <option value="Other" className="dark:bg-[#1E293B] dark:text-slate-200">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Select default currency"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code} className="dark:bg-[#1E293B] dark:text-slate-200">
                    {curr.code} ({curr.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Initial Members (comma-separated)
            </label>
            <input
              type="text"
              value={membersInput}
              onChange={(e) => setMembersInput(e.target.value)}
              placeholder="e.g. Sarah, Liam (optional)"
              className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">You are automatically added as the group owner.</span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewGroupModalOpen(false)}
              className="flex-1 h-12 rounded-full bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
            >
              <Check className="w-4 h-4" />
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
