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
  const [membersInput, setMembersInput] = useState('Alex Rivera, Maya Chen');

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
    setMembersInput('Alex Rivera, Maya Chen');
    setIsNewGroupModalOpen(false);
  };

  if (!isNewGroupModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl p-6 flex flex-col gap-5 border border-slate-200/80 max-h-[90vh] overflow-y-auto thin-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Group Ledger</h3>
              <p className="text-xs text-slate-500">Create a shared space for expenses</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNewGroupModalOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Summer Trip, Apartment 4B, Project Team"
              required
              className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Select ledger category"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#059669]"
              >
                <option value="Trip">Trip / Travel</option>
                <option value="Home">Home / Rent</option>
                <option value="Couple">Couple / Partner</option>
                <option value="Work">Work / Project</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Select default currency"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#059669]"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} ({curr.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Initial Members (comma-separated)
            </label>
            <input
              type="text"
              value={membersInput}
              onChange={(e) => setMembersInput(e.target.value)}
              placeholder="Alex, Sarah, Liam"
              className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">You are automatically added as the group owner.</span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewGroupModalOpen(false)}
              className="flex-1 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
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
