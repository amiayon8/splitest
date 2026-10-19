"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSplitest } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { calculateMemberBalances, getCurrentUserBalance, getCurrentUserMemberName, isMemberCurrentUser } from "@/lib/split-calculator";
import {
  Plus,
  Handshake,
  Share2,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

export function WalletCardDeck() {
  const {
    expenseGroups,
    activeGroupId,
    setActiveGroupId,
    allExpenses,
    allSettlements,
    setIsAddExpenseModalOpen,
    setIsSettleModalOpen,
    setIsShareModalOpen,
    setIsLedgerSettingsModalOpen,
    setIsNewGroupModalOpen,
    activeCurrency,
    userProfile,
  } = useSplitest();

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragDeltaX, setDragDeltaX] = useState(0);

  const currentIndex = Math.max(
    0,
    expenseGroups.findIndex((g) => g.id === activeGroupId),
  );

  const groupStats = useMemo(() => {
    const map: Record<
      string,
      { net: number; youOwe: number; youAreOwed: number }
    > = {};
    for (const group of expenseGroups) {
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
      const currentMemberName = getCurrentUserMemberName(group, userProfile);
      const isSelf = (n: string) => isMemberCurrentUser(n, group, userProfile);
      const net = getCurrentUserBalance(balances, group, userProfile)?.netBalance || 0;

      let youOwe = 0;
      for (const exp of gExpenses) {
        if (!isSelf(exp.paidByName)) {
          const yourSplit = exp.splits.find((s) => isSelf(s.memberName));
          if (yourSplit) youOwe += yourSplit.shareAmount;
        }
      }
      for (const settle of gSettlements) {
        if (isSelf(settle.payerName)) youOwe -= settle.amount;
      }

      let youAreOwed = 0;
      for (const exp of gExpenses) {
        if (isSelf(exp.paidByName)) {
          for (const split of exp.splits) {
            if (!isSelf(split.memberName)) youAreOwed += split.shareAmount;
          }
        }
      }
      for (const settle of gSettlements) {
        if (isSelf(settle.recipientName)) youAreOwed -= settle.amount;
      }

      map[group.id] = {
        net,
        youOwe: Math.max(0, Math.round(youOwe * 100) / 100),
        youAreOwed: Math.max(0, Math.round(youAreOwed * 100) / 100),
      };
    }
    return map;
  }, [expenseGroups, allExpenses, allSettlements, userProfile]);

  const centerCardInContainer = (index: number, behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    const targetCard = cardRefs.current[index];
    if (!container || !targetCard) return;

    const containerWidth = container.offsetWidth;
    const cardWidth = targetCard.offsetWidth;
    const cardLeft = targetCard.offsetLeft;
    const targetScrollLeft = cardLeft - (containerWidth - cardWidth) / 2;

    container.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior,
    });
  };

  useEffect(() => {
    if (isDraggingRef.current || isProgrammaticScrollRef.current) return;
    centerCardInContainer(currentIndex, "smooth");
  }, [currentIndex]);

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current || isDraggingRef.current) return;
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

    if (closestIndex !== currentIndex && expenseGroups[closestIndex]) {
      setActiveGroupId(expenseGroups[closestIndex].id);
    }
  };

  const scrollToCard = (index: number) => {
    if (index < 0 || index >= expenseGroups.length) return;
    isProgrammaticScrollRef.current = true;
    setActiveGroupId(expenseGroups[index].id);
    centerCardInContainer(index, "smooth");

    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 450);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX;
    startYRef.current = e.pageY;
    startTimeRef.current = Date.now();
    scrollLeftRef.current = container.scrollLeft;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const currentContainer = containerRef.current;
      const deltaX = moveEvent.pageX - startXRef.current;
      const deltaY = moveEvent.pageY - startYRef.current;

      if (!hasMovedRef.current) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
          isDraggingRef.current = false;
          setIsDragging(false);
          setDragDeltaX(0);
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);
          window.removeEventListener("pointercancel", handlePointerUp);
          return;
        }

        if (Math.abs(deltaX) > 6) {
          hasMovedRef.current = true;
          setIsDragging(true);
          currentContainer.style.scrollSnapType = "none";
        }
      }

      if (hasMovedRef.current) {
        moveEvent.preventDefault();
        setDragDeltaX(deltaX);
        currentContainer.scrollLeft = scrollLeftRef.current - deltaX;
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      const currentContainer = containerRef.current;
      if (currentContainer) {
        currentContainer.style.scrollSnapType = "x mandatory";
      }

      if (isDraggingRef.current && hasMovedRef.current) {
        const deltaX = upEvent.pageX - startXRef.current;
        const duration = Math.max(1, Date.now() - startTimeRef.current);
        const velocity = deltaX / duration;

        if (deltaX < -50 || velocity < -0.25) {
          scrollToCard(Math.min(expenseGroups.length - 1, currentIndex + 1));
        } else if (deltaX > 50 || velocity > 0.25) {
          scrollToCard(Math.max(0, currentIndex - 1));
        } else if (currentContainer) {
          const containerCenter = currentContainer.scrollLeft + currentContainer.offsetWidth / 2;
          let closestIndex = currentIndex;
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
          scrollToCard(closestIndex);
        }
      }

      isDraggingRef.current = false;
      setIsDragging(false);
      setDragDeltaX(0);

      setTimeout(() => {
        hasMovedRef.current = false;
      }, 60);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const handleCardClick = (index: number) => {
    if (hasMovedRef.current) return;
    scrollToCard(index);
  };

  if (expenseGroups.length === 0) {
    return (
      <div className="w-full rounded-3xl p-8 border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#1E293B]/40 flex flex-col items-center justify-center text-center gap-3 select-none">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-[#34D399] flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Groups in Database
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Create your first group ledger to begin tracking expenses and resolving debts.
        </p>
        <button
          type="button"
          onClick={() => setIsNewGroupModalOpen(true)}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create First Group</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full select-none">
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => scrollToCard(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none transition-all items-center justify-center"
          aria-label="Previous card"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => scrollToCard(currentIndex + 1)}
          disabled={currentIndex === expenseGroups.length - 1}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none transition-all items-center justify-center"
          aria-label="Next card"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          className={`flex items-stretch gap-4 overflow-x-auto py-3 px-4 sm:px-[calc(50%-220px)] snap-x snap-mandatory no-scrollbar overscroll-x-contain touch-pan-y ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ scrollPaddingLeft: "1rem", scrollPaddingRight: "1rem" }}
        >
          {expenseGroups.map((group, index) => {
            const isSelected = index === currentIndex;
            const stats = groupStats[group.id] || {
              net: 0,
              youOwe: 0,
              youAreOwed: 0,
            };
            const net = stats.net;
            const isGroupViewOnly = group.userRole === "viewer";
            const dynamicRotation = isDragging && isSelected
              ? Math.max(-2, Math.min(2, dragDeltaX * 0.012))
              : 0;

            return (
              <div
                key={group.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                onClick={() => handleCardClick(index)}
                style={{
                  transform: dynamicRotation ? `rotate(${dynamicRotation}deg)` : undefined,
                }}
                className={`snap-center shrink-0 w-[88vw] sm:w-110 max-w-115 rounded-3xl p-6 border flex flex-col justify-between gap-5 cursor-pointer ${
                  isDragging ? "transition-none" : "transition-all duration-300 ease-out"
                } ${
                  isSelected
                    ? `bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 ring-2 ring-slate-900/5 dark:ring-white/5 scale-100 opacity-100 ${
                        isDragging ? "shadow-xl" : "shadow-md"
                      }`
                    : "bg-white/90 dark:bg-[#1E293B]/80 border-slate-200/60 dark:border-slate-800 shadow-xs scale-[0.96] opacity-75 hover:opacity-90"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-colors ${
                        net > 0
                          ? "bg-[#D1FAE5] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#A7F3D0]"
                          : net < 0
                            ? "bg-[#FFE4E6] dark:bg-[#881337]/70 text-[#9F1239] dark:text-[#FECDD3]"
                            : "bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {group.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                          {group.name}
                        </h3>
                        {isGroupViewOnly ? (
                          <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            View Only
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-[#D1FAE5] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#A7F3D0] px-2 py-0.5 rounded-full">
                            {group.userRole === "owner" ? "Owner" : "Editor"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <Users className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{group.members.length} members</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveGroupId(group.id);
                        setIsLedgerSettingsModalOpen(true);
                      }}
                      className="w-8 h-8 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                      aria-label="Ledger Settings"
                      title="Ledger Settings"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveGroupId(group.id);
                        setIsShareModalOpen(true);
                      }}
                      className="w-8 h-8 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                      aria-label="Share group"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                    Current Balance
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight ${
                        net > 0
                          ? "text-[#059669] dark:text-[#10B981]"
                          : net < 0
                            ? "text-[#E11D48] dark:text-[#F43F5E]"
                            : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {net > 0
                        ? `+${formatCurrency(net, group.defaultCurrency || activeCurrency)}`
                        : net < 0
                          ? `-${formatCurrency(Math.abs(net), group.defaultCurrency || activeCurrency)}`
                          : formatCurrency(0, group.defaultCurrency || activeCurrency)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {net > 0
                        ? "owed to you"
                        : net < 0
                          ? "you owe"
                          : "all settled"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-2xl bg-[#FFE4E6]/50 dark:bg-[#881337]/30 border border-[#FECDD3] dark:border-[#9F1239] text-xs">
                    <span className="text-[#9F1239] dark:text-[#FECDD3] block text-[10px] font-semibold uppercase tracking-wider">
                      You Owe
                    </span>
                    <span className="text-sm font-bold text-[#9F1239] dark:text-[#FECDD3] tabular-nums mt-0.5 block">
                      {formatCurrency(stats.youOwe, group.defaultCurrency || activeCurrency)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-[#D1FAE5]/50 dark:bg-[#064E3B]/30 border border-[#A7F3D0] dark:border-[#047857] text-xs">
                    <span className="text-[#065F46] dark:text-[#A7F3D0] block text-[10px] font-semibold uppercase tracking-wider">
                      You Are Owed
                    </span>
                    <span className="text-sm font-bold text-[#065F46] dark:text-[#A7F3D0] tabular-nums mt-0.5 block">
                      {formatCurrency(stats.youAreOwed, group.defaultCurrency || activeCurrency)}
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
                      className="flex-1 h-10 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                    >
                      <Handshake className="w-3.5 h-3.5 text-[#059669] dark:text-[#10B981]" />
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
        {expenseGroups.map((group, index) => {
          const isSelected = index === currentIndex;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => scrollToCard(index)}
              className={`rounded-full transition-all duration-300 ${
                isSelected
                  ? "w-6 h-2 bg-slate-900 dark:bg-slate-100"
                  : "w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
              }`}
              aria-label={`Jump to ${group.name}`}
            />
          );
        })}
      </div>
    </div>
  );
}
