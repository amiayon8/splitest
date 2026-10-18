"use client";

import React, { useState } from "react";
import { useSplitest } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { LocalTime } from "@/lib/timezone";
import { Expense } from "@/types";
import {
  X,
  Send,
  Trash2,
  MessageSquare,
  Palmtree,
  Utensils,
  Car,
  Compass,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<Expense["category"], LucideIcon> = {
  villa: Palmtree,
  dining: Utensils,
  transport: Car,
  activities: Compass,
  groceries: ShoppingBag,
  general: Tag,
};

export function TransactionReceiptModal() {
  const {
    selectedExpense,
    selectedExpenseId,
    setSelectedExpenseId,
    deleteExpense,
    addComment,
    isViewOnly,
    activeCurrency,
    showToast,
  } = useSplitest();

  const [commentText, setCommentText] = useState("");

  if (!selectedExpenseId || !selectedExpense) return null;

  const youPaid = selectedExpense.paidByName === "You";
  const yourSplit = selectedExpense.splits.find((s) => s.memberName === "You");
  const yourShare = yourSplit ? yourSplit.shareAmount : 0;
  const yourNet = youPaid ? selectedExpense.amount - yourShare : -yourShare;

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    await addComment(selectedExpense.id, text, "You");
  };

  const handleDelete = async () => {
    await deleteExpense(selectedExpense.id);
    setSelectedExpenseId(null);
    showToast(`Deleted "${selectedExpense.description}"`);
  };

  const IconComp = CATEGORY_ICONS[selectedExpense.category] || Tag;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 xl:hidden select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl p-6 flex flex-col gap-5 border border-slate-200/80 max-h-[90vh] overflow-y-auto thin-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img
              src="/Splitest.svg"
              alt="Splitest"
              className="w-5 h-5 object-contain"
            />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Splitest Receipt
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedExpenseId(null)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center shrink-0">
            <IconComp className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {selectedExpense.description}
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              <LocalTime isoString={selectedExpense.date} format="full" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-500">Total amount</span>
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(
                selectedExpense.amount,
                selectedExpense.currencyCode || activeCurrency,
              )}
            </span>
          </div>

          <div className="h-px bg-slate-200/70" />

          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Paid by</span>
            <span className="font-semibold text-slate-800">
              {selectedExpense.paidByName}
            </span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Your share</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatCurrency(yourShare, activeCurrency)}
            </span>
          </div>

          <div className="h-px bg-slate-200/70" />

          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-800">Your net balance</span>
            <span
              className={`tabular-nums text-sm ${
                yourNet > 0
                  ? "text-[#059669]"
                  : yourNet < 0
                    ? "text-[#E11D48]"
                    : "text-slate-600"
              }`}
            >
              {yourNet > 0
                ? `+${formatCurrency(yourNet, activeCurrency)}`
                : yourNet < 0
                  ? `-${formatCurrency(Math.abs(yourNet), activeCurrency)}`
                  : "Settled"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Split Breakdown ({selectedExpense.splits.length})
          </span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto thin-scrollbar pr-1">
            {selectedExpense.splits.map((s) => (
              <div
                key={s.id}
                className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/60 flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-slate-800">
                  {s.memberName}
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatCurrency(s.shareAmount, activeCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            Notes & Comments ({selectedExpense.comments.length})
          </span>

          {selectedExpense.comments.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto thin-scrollbar">
              {selectedExpense.comments.map((comm) => (
                <div
                  key={comm.id}
                  className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/60 text-xs"
                >
                  <span className="font-bold text-slate-900">
                    {comm.authorName}:{" "}
                  </span>
                  <span className="text-slate-600">{comm.content}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              placeholder="Add a comment..."
              className="flex-1 h-10 px-4 rounded-full bg-[#F8FAFC] border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
            />
            <button
              type="button"
              onClick={handleAddComment}
              className="w-10 h-10 rounded-full bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center shrink-0 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isViewOnly && (
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E11D48] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Expense
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
