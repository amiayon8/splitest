'use client';

import React, { useState } from 'react';
import { useSplitest } from '@/lib/store';
import { X, Handshake, Check } from 'lucide-react';

export function SettleModal() {
  const {
    activeGroup,
    isSettleModalOpen,
    setIsSettleModalOpen,
    settlePrefill,
    addSettlement,
    showToast,
    activeCurrency,
  } = useSplitest();

  const [recipient, setRecipient] = useState(() => {
    if (settlePrefill?.recipient) return settlePrefill.recipient;
    const otherMembers = activeGroup.members.filter((m) => m.name !== 'You');
    return otherMembers[0]?.name || '';
  });

  const [payer, setPayer] = useState('You');
  const [amountInput, setAmountInput] = useState(() => {
    if (settlePrefill?.amount) return settlePrefill.amount.toFixed(2);
    return '50.00';
  });

  const [method, setMethod] = useState('Bank Transfer');
  const [notes, setNotes] = useState('');

  const currentRecipient = recipient || activeGroup.members.filter((m) => m.name !== payer)[0]?.name || '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseFloat(amountInput);
    if (!currentRecipient || isNaN(parsedAmount) || parsedAmount <= 0) return;

    await addSettlement({
      groupId: activeGroup.id,
      payerName: payer,
      recipientName: currentRecipient,
      amount: parsedAmount,
      method,
      notes: notes.trim(),
    });

    setIsSettleModalOpen(false);
    showToast(`Recorded settlement of $${parsedAmount.toFixed(2)} to ${currentRecipient}`);
  };

  if (!isSettleModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-5 border border-slate-200/80 dark:border-slate-800 max-h-[90vh] overflow-y-auto thin-scrollbar">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/50 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Record a payment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{activeGroup.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettleModalOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payer</label>
              <select
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                aria-label="Select payer"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
              >
                {activeGroup.members.map((m) => (
                  <option key={m.id} value={m.name} className="dark:bg-[#1E293B] dark:text-slate-200">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Recipient</label>
              <select
                value={currentRecipient}
                onChange={(e) => setRecipient(e.target.value)}
                aria-label="Select recipient"
                className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
              >
                {activeGroup.members
                  .filter((m) => m.name !== payer)
                  .map((m) => (
                    <option key={m.id} value={m.name} className="dark:bg-[#1E293B] dark:text-slate-200">
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Amount ({activeCurrency})</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                required
                className="w-full h-12 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-base font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981] tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              aria-label="Select payment method"
              className="w-full h-11 px-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
            >
              <option value="Bank Transfer" className="dark:bg-[#1E293B] dark:text-slate-200">Bank Transfer</option>
              <option value="Cash" className="dark:bg-[#1E293B] dark:text-slate-200">Cash</option>
              <option value="Venmo" className="dark:bg-[#1E293B] dark:text-slate-200">Venmo</option>
              <option value="PayPal" className="dark:bg-[#1E293B] dark:text-slate-200">PayPal</option>
              <option value="Revolut" className="dark:bg-[#1E293B] dark:text-slate-200">Revolut</option>
              <option value="bKash" className="dark:bg-[#1E293B] dark:text-slate-200">bKash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Dinner reimbursement"
              className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSettleModalOpen(false)}
              className="flex-1 h-12 rounded-full bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
            >
              <Check className="w-4 h-4" />
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
