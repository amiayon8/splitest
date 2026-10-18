"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { useSplitest } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { calculateMemberBalances } from "@/lib/split-calculator";
import {
  Plus,
  Handshake,
  Share2,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function WalletCardDeck() {
  const {
    groups,
    activeGroupId,
    setActiveGroupId,
    allExpenses,
    allSettlements,
    setIsAddExpenseModalOpen,
    setIsSettleModalOpen,
    setIsShareModalOpen,
    activeCurrency,
  } = useSplitest();

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const currentIndex = Math.max(
    0,
    groups.findIndex((g) => g.id === activeGroupId),
  );

  const groupStats = useMemo(() => {
    const map: Record<
      string,
      { net: number; youOwe: number; youAreOwed: number }
    > = {};
    for (const group of groups) {
      const gExpenses = allExpenses.filter((item) => item.groupId === group.id);
      const gSettlements = allSettlements.filter(
        (item) => item.groupId === group.id,
      );
      const memberNames = group.members.map((m) => m.name);
      const balances = calculateMemberBalances(
        memberNames,
        gExpenses,
        gSettlements,
      );
      const net = balances["You"]?.netBalance || 0;

      let youOwe = 0;
      for (const exp of gExpenses) {
        if (exp.paidByName !== "You") {
          const yourSplit = exp.splits.find((s) => s.memberName === "You");
          if (yourSplit) youOwe += yourSplit.shareAmount;
        }
      }
      for (const settle of gSettlements) {
        if (settle.payerName === "You") youOwe -= settle.amount;
      }

      let youAreOwed = 0;
      for (const exp of gExpenses) {
        if (exp.paidByName === "You") {
          for (const split of exp.splits) {
            if (split.memberName !== "You") youAreOwed += split.shareAmount;
          }
        }
      }
      for (const settle of gSettlements) {
        if (settle.recipientName === "You") youAreOwed -= settle.amount;
      }

      map[group.id] = {
        net,
        youOwe: Math.max(0, Math.round(youOwe * 100) / 100),
        youAreOwed: Math.max(0, Math.round(youAreOwed * 100) / 100),
      };
    }
    return map;
  }, [groups, allExpenses, allSettlements]);

  useEffect(() => {
    cardRefs.current[currentIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentIndex]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const containerCenter = container.scrollLeft + container.offsetWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== currentIndex && groups[closestIndex]) {
      setActiveGroupId(groups[closestIndex].id);
    }
  };

  const scrollToCard = (index: number) => {
    if (index < 0 || index >= groups.length) return;
    setActiveGroupId(groups[index].id);
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 6) {
      hasMovedRef.current = true;
    }
    container.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    handleScroll();
  };

  const handleCardClick = (index: number) => {
    if (hasMovedRef.current) return;
    scrollToCard(index);
  };

  return (
    <div className="flex flex-col gap-3 w-full select-none">
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => scrollToCard(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-md text-slate-700 hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none transition-all items-center justify-center"
          aria-label="Previous card"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => scrollToCard(currentIndex + 1)}
          disabled={currentIndex === groups.length - 1}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-md text-slate-700 hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none transition-all items-center justify-center"
          aria-label="Next card"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex items-stretch gap-4 overflow-x-auto py-2 px-1 snap-x snap-mandatory no-scrollbar overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing"
          style={{ scrollPaddingLeft: "1rem", scrollPaddingRight: "1rem" }}
        >
          {groups.map((group, index) => {
            const isSelected = index === currentIndex;
            const stats = groupStats[group.id] || {
              net: 0,
              youOwe: 0,
              youAreOwed: 0,
            };
            const net = stats.net;
            const isGroupViewOnly = group.userRole === "viewer";

            return (
              <div
                key={group.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                onClick={() => handleCardClick(index)}
                className={`snap-center shrink-0 w-[88vw] sm:w-[440px] max-w-[460px] rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between gap-5 cursor-pointer ${
                  isSelected
                    ? "bg-white border-slate-200 shadow-md ring-2 ring-slate-900/5 scale-100 opacity-100"
                    : "bg-white/90 border-slate-200/60 shadow-xs scale-[0.96] opacity-75 hover:opacity-90"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-colors ${
                        net > 0
                          ? "bg-[#D1FAE5] text-[#065F46]"
                          : net < 0
                            ? "bg-[#FFE4E6] text-[#9F1239]"
                            : "bg-[#F1F5F9] text-slate-700"
                      }`}
                    >
                      {group.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">
                          {group.name}
                        </h3>
                        {isGroupViewOnly ? (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            View Only
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-full">
                            {group.userRole === "owner" ? "Owner" : "Editor"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{group.members.length} members</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGroupId(group.id);
                      setIsShareModalOpen(true);
                    }}
                    className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                    aria-label="Share group"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                    Current Balance
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight ${
                        net > 0
                          ? "text-[#059669]"
                          : net < 0
                            ? "text-[#E11D48]"
                            : "text-slate-800"
                      }`}
                    >
                      {net > 0
                        ? `+${formatCurrency(net, activeCurrency)}`
                        : net < 0
                          ? `-${formatCurrency(Math.abs(net), activeCurrency)}`
                          : formatCurrency(0, activeCurrency)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {net > 0
                        ? "owed to you"
                        : net < 0
                          ? "you owe"
                          : "all settled"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
                  <div className="p-2.5 rounded-2xl bg-[#FFE4E6]/50 border border-[#FECDD3] text-xs">
                    <span className="text-[#9F1239] block text-[10px] font-semibold uppercase tracking-wider">
                      You Owe
                    </span>
                    <span className="text-sm font-bold text-[#9F1239] tabular-nums mt-0.5 block">
                      {formatCurrency(stats.youOwe, activeCurrency)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-[#D1FAE5]/50 border border-[#A7F3D0] text-xs">
                    <span className="text-[#065F46] block text-[10px] font-semibold uppercase tracking-wider">
                      You Are Owed
                    </span>
                    <span className="text-sm font-bold text-[#065F46] tabular-nums mt-0.5 block">
                      {formatCurrency(stats.youAreOwed, activeCurrency)}
                    </span>
                  </div>
                </div>

                {!isGroupViewOnly && isSelected && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveGroupId(group.id);
                        setIsAddExpenseModalOpen(true);
                      }}
                      className="flex-1 h-10 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Expense</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveGroupId(group.id);
                        setIsSettleModalOpen(true);
                      }}
                      className="flex-1 h-10 rounded-full bg-[#F1F5F9] hover:bg-slate-200/80 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                    >
                      <Handshake className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Settle Up</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-1">
        {groups.map((group, index) => {
          const isSelected = index === currentIndex;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => scrollToCard(index)}
              className={`rounded-full transition-all duration-300 ${
                isSelected
                  ? "w-6 h-2 bg-slate-900"
                  : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Jump to ${group.name}`}
            />
          );
        })}
      </div>
    </div>
  );
}
